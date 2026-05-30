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
     * Each tenant DB holds exactly one template_settings row whose
     * template_slug names the active template. Loads the row (seeding
     * with defaults if the tenant is brand-new) and returns the slug
     * the caller should respect.
     */
    private function loadOrSeedRow(): object
    {
        $row = DB::table('template_settings')->first();
        if ($row) return $row;

        $slug = TemplateDefaults::DEFAULT_TEMPLATE_SLUG;
        DB::table('template_settings')->insert([
            'template_slug' => $slug,
            'settings_json' => json_encode(TemplateDefaults::settingsFor($slug)),
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);
        return DB::table('template_settings')->first();
    }

    /**
     * GET /editor/website/template
     */
    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row  = $this->loadOrSeedRow();
        $slug = $row->template_slug ?: TemplateDefaults::DEFAULT_TEMPLATE_SLUG;

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
     * persist onto the tenant's single row (whatever its current slug
     * is), return merged result.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => 'required|array',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row  = $this->loadOrSeedRow();
        $slug = $row->template_slug ?: TemplateDefaults::DEFAULT_TEMPLATE_SLUG;

        $existing = $row->settings_json ? json_decode($row->settings_json, true) : [];

        $merged = TemplateDefaults::mergeWithDefaults($slug, $existing);
        $merged = TemplateDefaults::mergeWithDefaults($slug, array_replace_recursive(
            $merged,
            $validated['settings']
        ));

        DB::table('template_settings')
            ->where('id', $row->id)
            ->update([
                'settings_json' => json_encode($merged),
                'updated_at'    => now(),
            ]);

        tenancy()->end();

        return response()->json([
            'template_slug' => $slug,
            'settings'      => $merged,
        ]);
    }
}
