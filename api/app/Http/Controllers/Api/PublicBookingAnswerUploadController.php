<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
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
 * Phase S3 hardening:
 *   - route-level throttle (see routes/api.php)
 *   - rejects when no active image-type booking_question exists for the
 *     tenant — kills uploads against tenants that aren't soliciting them
 *   - per-tenant daily upload cap (file + byte) via Laravel cache
 */
class PublicBookingAnswerUploadController extends Controller
{
    private const MAX_BYTES         = 10 * 1024 * 1024;
    private const MAX_EDGE_PX       = 2000;
    private const WEBP_QUALITY      = 82;
    private const DAILY_FILE_CAP    = 200;            // per tenant per day
    private const DAILY_BYTE_CAP    = 100 * 1024 * 1024; // 100 MB per tenant per day

    public function store(Request $request, string $slug): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:10240|mimetypes:image/jpeg,image/png,image/webp,image/heic,image/heif',
        ]);

        // Slug → tenant via the domains table. We do NOT initialize tenancy
        // here because the file goes straight to R2; we only need the
        // tenant id for the storage path. We DO initialize briefly to gate
        // on booking_questions below.
        $tenant = Tenant::whereHas('domains', fn ($q) => $q->where('domain', 'like', $slug . '.%'))->first();
        if (! $tenant) {
            return response()->json(['message' => 'Site not found'], 404);
        }

        // Phase S3 — refuse uploads when the tenant hasn't configured an
        // active image-type booking_question. A random tenant slug should
        // never be a usable R2 dump target.
        if (! $this->hasActiveImageQuestion($tenant)) {
            Log::channel('security')->info('upload.rejected.no_image_question', [
                'tenant' => $tenant->getKey(),
                'ip'     => $request->ip(),
            ]);
            return response()->json([
                'message' => 'This site is not accepting image uploads.',
            ], 403);
        }

        // Phase S3 — per-tenant daily quota. Counters live in Laravel cache
        // keyed by tenant + UTC date. Resets at midnight naturally because
        // we set the TTL to "end of day".
        $today    = Carbon::now('UTC')->toDateString();
        $fileKey  = "upload_count:{$tenant->getKey()}:{$today}";
        $byteKey  = "upload_bytes:{$tenant->getKey()}:{$today}";
        $fileCount = (int) (Cache::get($fileKey) ?? 0);
        $byteCount = (int) (Cache::get($byteKey) ?? 0);
        if ($fileCount >= self::DAILY_FILE_CAP || $byteCount >= self::DAILY_BYTE_CAP) {
            Log::channel('security')->warning('upload.quota.exceeded', [
                'tenant'  => $tenant->getKey(),
                'files'   => $fileCount,
                'bytes'   => $byteCount,
                'ip'      => $request->ip(),
            ]);
            return response()->json([
                'message' => 'Daily upload limit reached. Try again tomorrow.',
            ], 429);
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

        // Bump quotas AFTER the successful write so failed uploads don't
        // chip away at the daily cap.
        $ttlSeconds = max(60, Carbon::now('UTC')->endOfDay()->diffInSeconds(Carbon::now('UTC')));
        Cache::put($fileKey, $fileCount + 1, $ttlSeconds);
        Cache::put($byteKey, $byteCount + strlen($encoded), $ttlSeconds);

        $base = rtrim((string) config('filesystems.disks.r2.url'), '/');
        $url  = $base !== '' ? "{$base}/{$key}" : Storage::disk('r2')->url($key);

        return response()->json([
            'url'   => $url,
            'key'   => $key,
            'bytes' => strlen($encoded),
        ], 201);
    }

    /**
     * True when the tenant currently has at least one active image-type
     * booking_question. We initialize tenancy briefly, check, and exit so
     * the rest of the upload pipeline runs in the central scope (R2 is
     * tenant-agnostic).
     */
    private function hasActiveImageQuestion(Tenant $tenant): bool
    {
        try {
            tenancy()->initialize($tenant);
            if (! Schema::hasTable('booking_questions')) {
                tenancy()->end();
                return false;
            }
            $exists = DB::table('booking_questions')
                ->where('is_active', true)
                ->where('type', 'image')
                ->exists();
            tenancy()->end();
            return $exists;
        } catch (\Throwable $e) {
            try { tenancy()->end(); } catch (\Throwable) {}
            // Fail closed — don't accept uploads when we can't verify.
            return false;
        }
    }
}
