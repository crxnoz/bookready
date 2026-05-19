<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaController extends Controller
{
    /**
     * Accept a file upload and store it under the tenant's directory.
     * Returns the public URL for use in the editor.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:jpg,jpeg,png,webp,gif'],
        ]);

        $tenantId = tenancy()->tenant->id;
        $path     = $request->file('file')->store("tenants/{$tenantId}/media", 'public');

        return response()->json([
            'url' => Storage::disk('public')->url($path),
            'path' => $path,
        ], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->validate(['path' => ['required', 'string']]);

        $tenantId = tenancy()->tenant->id;

        // Guard: only allow deletion within the tenant's own directory
        if (! str_starts_with($request->path, "tenants/{$tenantId}/")) {
            abort(403);
        }

        Storage::disk('public')->delete($request->path);

        return response()->json(null, 204);
    }
}
