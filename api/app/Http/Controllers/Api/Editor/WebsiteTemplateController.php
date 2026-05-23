<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Support\TemplateDefaults;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WebsiteTemplateController extends Controller
{
    /**
     * GET /editor/website/template
     *
     * Returns the current template slug + merged settings.
     * Seeds defaults if no record exists.
     */
    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $slug = TemplateDefaults::DEFAULT_TEMPLATE_SLUG;
        $row  = DB::table('template_settings')->where('template_slug', $slug)->first();

        if (! $row) {
            DB::table('template_settings')->insert([
                'template_slug' => $slug,
                'settings_json' => json_encode(TemplateDefaults::settingsFor($slug)),
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
            $row = DB::table('template_settings')->where('template_slug', $slug)->first();
        }

        $stored   = $row->settings_json ? json_decode($row->settings_json, true) : [];
        $settings = TemplateDefaults::mergeWithDefaults($slug, $stored);

        tenancy()->end();

        return response()->json([
            'template_slug' => $slug,
            'settings'      => $settings,
        ]);
    }

    /**
     * PATCH /editor/website/template
     *
     * Accept partial settings, deep-merge with existing stored settings,
     * persist, return merged result.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => 'required|array',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $slug = TemplateDefaults::DEFAULT_TEMPLATE_SLUG;
        $row  = DB::table('template_settings')->where('template_slug', $slug)->first();

        $existing = $row && $row->settings_json
            ? json_decode($row->settings_json, true)
            : [];

        $merged = TemplateDefaults::mergeWithDefaults($slug, $existing);
        $merged = TemplateDefaults::mergeWithDefaults($slug, array_replace_recursive(
            $merged,
            $validated['settings']
        ));

        if ($row) {
            DB::table('template_settings')
                ->where('template_slug', $slug)
                ->update([
                    'settings_json' => json_encode($merged),
                    'updated_at'    => now(),
                ]);
        } else {
            DB::table('template_settings')->insert([
                'template_slug' => $slug,
                'settings_json' => json_encode($merged),
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        }

        tenancy()->end();

        return response()->json([
            'template_slug' => $slug,
            'settings'      => $merged,
        ]);
    }
}
