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

    /**
     * PUT /editor/website/template/active
     *
     * Switch the tenant's active template. The post-signup checkout picker
     * calls this so the template the owner selects actually drives the
     * public site — provisioning seeds a default template_settings row at
     * registration, and the Stripe webhook only records the choice in the
     * central tenant_subscriptions table (which the public site never
     * reads), so without this the picker was a no-op.
     *
     * When the slug actually changes we reseed settings_json + the
     * website_sections skeleton from that template's defaults. A tenant
     * switching templates is, in practice, a brand-new signup with no
     * customizations to preserve, and a different template implies a
     * different default layout + section set.
     */
    public function setTemplate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template_slug' => 'required|string|max:40',
        ]);
        $slug = TemplateDefaults::normalizeSlug($validated['template_slug']);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row         = $this->loadOrSeedRow();
        $currentSlug = $row->template_slug ?: TemplateDefaults::DEFAULT_TEMPLATE_SLUG;

        if ($currentSlug !== $slug) {
            DB::table('template_settings')
                ->where('id', $row->id)
                ->update([
                    'template_slug' => $slug,
                    'settings_json' => json_encode(TemplateDefaults::settingsFor($slug)),
                    'updated_at'    => now(),
                ]);

            // Reseed the section skeleton for the new template (single
            // template per tenant, so it's safe to clear + reinsert).
            $now  = now();
            $rows = array_map(fn (array $s) => [
                'template_slug' => $slug,
                'section_key'   => $s['section_key'],
                'section_type'  => $s['section_type'],
                'title'         => $s['title'],
                'subtitle'      => null,
                'content_json'  => null,
                'is_enabled'    => true,
                'is_locked'     => $s['is_locked'],
                'sort_order'    => $s['sort_order'],
                'created_at'    => $now,
                'updated_at'    => $now,
            ], TemplateDefaults::sectionsFor($slug));

            DB::table('website_sections')->delete();
            DB::table('website_sections')->insert($rows);
        }

        tenancy()->end();

        return response()->json(['template_slug' => $slug]);
    }
}
