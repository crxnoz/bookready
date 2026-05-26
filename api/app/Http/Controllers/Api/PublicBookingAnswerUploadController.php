<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\ImageManager;

/**
 * Phase 16 — public-facing booking-answer image upload.
 *
 * The booking form is anonymous, so we can't reuse the editor uploads
 * endpoint (Sanctum-gated). This standalone endpoint accepts an image,
 * resolves the tenant from the slug, processes the same way the editor
 * does (resize + webp), and returns a public URL.
 *
 * Hard-locked to:
 *   - kind=booking_answer (the path prefix)
 *   - 10 MB cap
 *   - image MIME types only
 *
 * If somebody starts abusing this, throttle middleware lives in api.php.
 */
class PublicBookingAnswerUploadController extends Controller
{
    private const MAX_BYTES    = 10 * 1024 * 1024;
    private const MAX_EDGE_PX  = 2000;
    private const WEBP_QUALITY = 82;

    public function store(Request $request, string $slug): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:10240|mimetypes:image/jpeg,image/png,image/webp,image/heic,image/heif',
        ]);

        // Slug → tenant via the domains table. We do NOT initialize tenancy
        // here because the file goes straight to R2; we only need the
        // tenant id for the storage path.
        $tenant = Tenant::whereHas('domains', fn ($q) => $q->where('domain', 'like', $slug . '.%'))->first();
        if (! $tenant) {
            return response()->json(['message' => 'Site not found'], 404);
        }

        $file = $request->file('file');
        if (! $file || ! $file->isValid()) {
            return response()->json(['message' => 'Upload failed'], 422);
        }
        if ($file->getSize() > self::MAX_BYTES) {
            return response()->json(['message' => 'File too large (10 MB max)'], 422);
        }

        try {
            $manager = new ImageManager(new GdDriver());
            $image   = $manager->read($file->getRealPath());

            if ($image->width() > self::MAX_EDGE_PX || $image->height() > self::MAX_EDGE_PX) {
                $image->scaleDown(width: self::MAX_EDGE_PX, height: self::MAX_EDGE_PX);
            }

            $encoded = (string) $image->toWebp(self::WEBP_QUALITY);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => 'Could not process image'], 422);
        }

        $key = sprintf(
            'tenants/%s/booking_answer/%s.webp',
            $tenant->getKey(),
            (string) Str::ulid(),
        );

        Storage::disk('r2')->put($key, $encoded, [
            'ContentType'  => 'image/webp',
            'CacheControl' => 'public, max-age=31536000, immutable',
        ]);

        $base = rtrim((string) config('filesystems.disks.r2.url'), '/');
        $url  = $base !== '' ? "{$base}/{$key}" : Storage::disk('r2')->url($key);

        return response()->json([
            'url'   => $url,
            'key'   => $key,
            'bytes' => strlen($encoded),
        ], 201);
    }
}
