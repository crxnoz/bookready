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

        // Hydrate the full current shape (existing + any new default keys),
        // then overlay the incoming partial with LIST-AWARE semantics.
        //
        // applyPartial replaces list values wholesale instead of merging
        // them by index. Using array_replace_recursive here (the previous
        // behaviour) meant deleting an item from any list-typed setting —
        // FAQ items, About highlights, advice/timeline steps, reviews,
        // About images — left the trailing elements behind, so the deleted
        // item reappeared the instant the editor re-rendered from the
        // server response. applyPartial fixes that while still preserving
        // untouched sibling keys on nested objects.
        $existingFull = TemplateDefaults::mergeWithDefaults($slug, $existing);
        $merged = TemplateDefaults::applyPartial($existingFull, $validated['settings']);

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
     * AND the in-editor "Change Template" picker both call this, so the
     * template the owner selects actually drives the public site.
     *
     * Switching PRESERVES the owner's existing customizations:
     *   - settings_json: deep-merged with the new template's defaults
     *     via TemplateDefaults::mergeWithDefaults. Owner-edited values
     *     (cover URL, avatar URL, accent_color, button URLs + toggles,
     *     pattern motif, tab labels, About body/highlights/images, FAQ +
     *     reviews + thank-you, custom heading overrides, etc.) all stick.
     *     Keys the new template introduces that the old didn't have
     *     (e.g. bottega's theme.pattern_motif) get filled in from the
     *     new defaults.
     *   - website_sections: existing rows are updated in place. Each
     *     section's is_enabled stays (so owner-disabled sections remain
     *     hidden) and sort_order is preserved IF the owner actually
     *     reordered it from the old template's default (= no surprise
     *     reset when they explicitly arranged sections). template_slug,
     *     section_type, title, is_locked are taken from the new
     *     template's defaults. Custom rows (sections the owner added,
     *     not in either template's default set) get their template_slug
     *     updated to the new slug and are otherwise left alone.
     *
     * Earlier behavior (pre-fix): reseeded settings_json + DELETED all
     * website_sections and reinserted from scratch, wiping every owner
     * customization on every template switch. That was acceptable when
     * the only call site was checkout (brand-new signup, nothing to
     * preserve), but the in-editor picker landed in 2026-06 and made
     * the regression visible — bottega demo got reset every time
     * someone tested the picker.
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
            // 1) settings_json — deep-merge owner edits with new template's
            //    defaults (NOT a replace).
            $existing = $row->settings_json ? json_decode($row->settings_json, true) : [];
            $merged   = TemplateDefaults::mergeWithDefaults($slug, $existing);

            DB::table('template_settings')
                ->where('id', $row->id)
                ->update([
                    'template_slug' => $slug,
                    'settings_json' => json_encode($merged),
                    'updated_at'    => now(),
                ]);

            // 2) website_sections — preserve is_enabled + sort_order
            //    where the owner actually changed them.
            $now = now();
            $oldSectionDefaults = [];
            foreach (TemplateDefaults::sectionsFor($currentSlug) as $def) {
                $oldSectionDefaults[$def['section_key']] = $def;
            }
            $newSectionDefaults = [];
            foreach (TemplateDefaults::sectionsFor($slug) as $def) {
                $newSectionDefaults[$def['section_key']] = $def;
            }

            $existingRows = DB::table('website_sections')->get()->keyBy('section_key');

            foreach ($newSectionDefaults as $key => $newDef) {
                $existingRow = $existingRows->get($key);
                $oldDef      = $oldSectionDefaults[$key] ?? null;

                if ($existingRow) {
                    $ownerReordered = $oldDef
                        && (int) $existingRow->sort_order !== (int) $oldDef['sort_order'];
                    $ownerDisabled = ! $existingRow->is_enabled;

                    DB::table('website_sections')
                        ->where('id', $existingRow->id)
                        ->update([
                            'template_slug' => $slug,
                            'section_type'  => $newDef['section_type'],
                            'title'         => $newDef['title'],
                            'is_enabled'    => $ownerDisabled ? 0 : 1,
                            'is_locked'     => $newDef['is_locked'] ? 1 : 0,
                            'sort_order'    => $ownerReordered
                                ? (int) $existingRow->sort_order
                                : (int) $newDef['sort_order'],
                            'updated_at'    => $now,
                        ]);
                } else {
                    DB::table('website_sections')->insert([
                        'template_slug' => $slug,
                        'section_key'   => $key,
                        'section_type'  => $newDef['section_type'],
                        'title'         => $newDef['title'],
                        'subtitle'      => null,
                        'content_json'  => null,
                        'is_enabled'    => 1,
                        'is_locked'     => $newDef['is_locked'] ? 1 : 0,
                        'sort_order'    => (int) $newDef['sort_order'],
                        'created_at'    => $now,
                        'updated_at'    => $now,
                    ]);
                }
            }

            // 3) Any custom rows the owner added (section_keys NOT in the
            //    new template's defaults) — keep them, just stamp the new
            //    template_slug. No shipped template currently surfaces a
            //    way to add custom sections, but the WebsiteSections
            //    store endpoint exists and tomorrow's editor might.
            $newKeys = array_keys($newSectionDefaults);
            DB::table('website_sections')
                ->whereNotIn('section_key', $newKeys)
                ->update(['template_slug' => $slug, 'updated_at' => $now]);
        }

        tenancy()->end();

        return response()->json(['template_slug' => $slug]);
    }
}
