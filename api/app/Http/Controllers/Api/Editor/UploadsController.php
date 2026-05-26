<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;

class UploadsController extends Controller
{
    private const ALLOWED_KINDS = ['gallery', 'before_after', 'header', 'logo', 'about', 'staff', 'service', 'category'];
    private const MAX_BYTES     = 10 * 1024 * 1024;   // 10 MB
    private const MAX_EDGE_PX   = 2000;
    private const WEBP_QUALITY  = 82;

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => "required|file|max:10240|mimetypes:image/jpeg,image/png,image/webp,image/heic,image/heif",
            'kind' => 'required|string|in:' . implode(',', self::ALLOWED_KINDS),
        ]);

        $file = $request->file('file');
        if (! $file || ! $file->isValid()) {
            return response()->json(['message' => 'Upload failed'], 422);
        }
        if ($file->getSize() > self::MAX_BYTES) {
            return response()->json(['message' => 'File too large (10 MB max)'], 422);
        }

        $tenant = Tenant::findOrFail($request->user()->tenant_id);

        try {
            $manager = new ImageManager(new GdDriver());
            $image   = $manager->read($file->getRealPath());

            // Resize so the longest edge is MAX_EDGE_PX; preserve aspect ratio.
            if ($image->width() > self::MAX_EDGE_PX || $image->height() > self::MAX_EDGE_PX) {
                $image->scaleDown(width: self::MAX_EDGE_PX, height: self::MAX_EDGE_PX);
            }

            $encoded = (string) $image->toWebp(self::WEBP_QUALITY);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => 'Could not process image'], 422);
        }

        $key = sprintf(
            'tenants/%s/%s/%s.webp',
            $tenant->getKey(),
            $validated['kind'],
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
