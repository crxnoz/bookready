<?php

use App\Support\TemplateDefaults;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Reorder-feature backfill.
 *
 * Templates now render their content tabs in website_sections.sort_order.
 * Historically every tenant was seeded with TheFadeRoom's section order
 * regardless of template, but each template RENDERS a different designed
 * order — so switching the templates to honor sort_order would otherwise
 * shuffle existing tenants' tabs on deploy.
 *
 * This re-syncs each tenant's section sort_order to its ACTIVE template's
 * designed order (from TemplateDefaults), so live sites look identical
 * after deploy and owners can then reorder from the editor. Idempotent;
 * safe to run on every tenant (no one has reordered yet).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('template_settings') || ! Schema::hasTable('website_sections')) {
            return;
        }

        $slug = TemplateDefaults::normalizeSlug(
            DB::table('template_settings')->value('template_slug')
        );

        // canonical section_key => sort_order for this tenant's template
        $order = [];
        foreach (TemplateDefaults::sectionsFor($slug) as $s) {
            $order[$s['section_key']] = $s['sort_order'];
        }

        // Map legacy section_keys onto their canonical counterparts so
        // tenants seeded before the M3 rename get fixed too.
        $aliases = [
            'before_after'       => 'results',
            'steps'              => 'advice',
            'before_appointment' => 'timeline',
            'policies'           => 'policy',
        ];
        foreach ($aliases as $legacy => $canonical) {
            if (isset($order[$canonical]) && ! isset($order[$legacy])) {
                $order[$legacy] = $order[$canonical];
            }
        }

        foreach ($order as $key => $sortOrder) {
            DB::table('website_sections')
                ->where('section_key', $key)
                ->update(['sort_order' => $sortOrder]);
        }
    }

    public function down(): void
    {
        // No-op: sort_order is cosmetic ordering; we don't restore the
        // previous (template-agnostic) values.
    }
};
