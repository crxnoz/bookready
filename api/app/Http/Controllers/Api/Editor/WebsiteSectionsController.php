<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Support\TemplateDefaults;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class WebsiteSectionsController extends Controller
{
    private const STANDARD_KEYS = [
        'header', 'book', 'gallery', 'policy', 'about',
        'results', 'advice', 'timeline', 'staff',
        'hours', 'contact', 'footer',
    ];

    private const ALLOWED_CUSTOM_TYPES = ['text_block', 'instructions', 'announcement'];

    private const MAX_CUSTOM_SECTIONS = 5;

    private function format(object $row): array
    {
        return [
            'id'            => (int)  $row->id,
            'template_slug' =>         $row->template_slug,
            'section_key'   =>         $row->section_key,
            'section_type'  =>         $row->section_type,
            'title'         =>         $row->title,
            'subtitle'      =>         $row->subtitle,
            'content_json'  =>         $row->content_json ? json_decode($row->content_json, true) : null,
            'is_enabled'    => (bool)  $row->is_enabled,
            'is_locked'     => (bool)  $row->is_locked,
            'sort_order'    => (int)   $row->sort_order,
            'created_at'    =>         $row->created_at,
            'updated_at'    =>         $row->updated_at,
        ];
    }

    /**
     * GET /editor/website/sections
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        // Use the tenant's ACTIVE template slug (from template_settings) for
        // seeding fresh rows — not the hardcoded DEFAULT_TEMPLATE_SLUG. The
        // active slug drives the public render; seeding with anything else
        // means the public reader would have to filter the wrong way around.
        $activeSlug = (string) (DB::table('template_settings')->value('template_slug')
            ?: TemplateDefaults::DEFAULT_TEMPLATE_SLUG);

        // No template_slug filter on the read — each tenant has exactly one
        // template, so all sections in the tenant DB belong to it (legacy
        // rows seeded under an old slug are still valid for this tenant).
        $count = DB::table('website_sections')->count();
        if ($count === 0) {
            $now = now();
            foreach (TemplateDefaults::sectionsFor($activeSlug) as $s) {
                DB::table('website_sections')->insert([
                    'template_slug' => $activeSlug,
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
                ]);
            }
        }

        $sections = DB::table('website_sections')
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->values()
            ->all();

        tenancy()->end();

        return response()->json($sections);
    }

    /**
     * POST /editor/website/sections
     * Custom sections only.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'section_type' => ['required', 'string', Rule::in(self::ALLOWED_CUSTOM_TYPES)],
            'title'        => 'nullable|string|max:255',
            'subtitle'     => 'nullable|string|max:500',
            'content_json' => 'nullable|array',
            'is_enabled'   => 'nullable|boolean',
            'sort_order'   => 'nullable|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        // Stamp the active template_slug onto new custom rows so legacy +
        // new rows share the same value going forward. Reads don't filter
        // by it anymore, but keeping it consistent keeps the data clean.
        $slug = (string) (DB::table('template_settings')->value('template_slug')
            ?: TemplateDefaults::DEFAULT_TEMPLATE_SLUG);

        $customCount = DB::table('website_sections')
            ->whereIn('section_type', self::ALLOWED_CUSTOM_TYPES)
            ->count();

        if ($customCount >= self::MAX_CUSTOM_SECTIONS) {
            tenancy()->end();
            return response()->json([
                'message' => 'Maximum number of custom sections reached (' . self::MAX_CUSTOM_SECTIONS . ').',
            ], 422);
        }

        // Generate unique key: type + timestamp
        $sectionKey = $validated['section_type'] . '_' . time() . '_' . rand(100, 999);

        $nextOrder = (int) DB::table('website_sections')
            ->where('is_locked', false)
            ->max('sort_order') + 1;

        // Keep custom sections below the locked footer (sort_order 99)
        if ($nextOrder >= 99) $nextOrder = 98;

        $id = DB::table('website_sections')->insertGetId([
            'template_slug' => $slug,
            'section_key'   => $sectionKey,
            'section_type'  => $validated['section_type'],
            'title'         => $validated['title']    ?? null,
            'subtitle'      => $validated['subtitle'] ?? null,
            'content_json'  => isset($validated['content_json']) ? json_encode($validated['content_json']) : null,
            'is_enabled'    => $validated['is_enabled'] ?? true,
            'is_locked'     => false,
            'sort_order'    => $validated['sort_order'] ?? $nextOrder,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        $row    = DB::table('website_sections')->find($id);
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result, 201);
    }

    /**
     * PATCH /editor/website/sections/{section}
     */
    public function update(Request $request, int $section): JsonResponse
    {
        $validated = $request->validate([
            'title'        => 'nullable|string|max:255',
            'subtitle'     => 'nullable|string|max:500',
            'content_json' => 'nullable|array',
            'is_enabled'   => 'sometimes|boolean',
            'sort_order'   => 'sometimes|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('website_sections')->find($section);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Section not found'], 404);
        }

        $data = ['updated_at' => now()];

        foreach (['title', 'subtitle'] as $field) {
            if (array_key_exists($field, $validated)) {
                $data[$field] = $validated[$field];
            }
        }

        if (array_key_exists('content_json', $validated)) {
            $data['content_json'] = $validated['content_json'] === null
                ? null
                : json_encode($validated['content_json']);
        }

        if (array_key_exists('sort_order', $validated) && ! $row->is_locked) {
            $data['sort_order'] = $validated['sort_order'];
        }

        if (array_key_exists('is_enabled', $validated)) {
            // For MVP: locked sections must remain enabled.
            if ($row->is_locked && ! $validated['is_enabled']) {
                tenancy()->end();
                return response()->json([
                    'message' => 'Locked sections cannot be disabled.',
                ], 422);
            }
            $data['is_enabled'] = $validated['is_enabled'];
        }

        DB::table('website_sections')->where('id', $section)->update($data);
        $updated = DB::table('website_sections')->find($section);
        $result  = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }

    /**
     * DELETE /editor/website/sections/{section}
     *
     * Locked  -> 422
     * Custom  -> hard delete
     * Standard optional -> soft-disable (is_enabled=false)
     */
    public function destroy(Request $request, int $section): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('website_sections')->find($section);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Section not found'], 404);
        }

        if ($row->is_locked) {
            tenancy()->end();
            return response()->json(['message' => 'Locked sections cannot be removed.'], 422);
        }

        $isCustom = in_array($row->section_type, self::ALLOWED_CUSTOM_TYPES, true)
                 && ! in_array($row->section_key, self::STANDARD_KEYS, true);

        if ($isCustom) {
            DB::table('website_sections')->where('id', $section)->delete();
            tenancy()->end();
            return response()->json(['message' => 'Section deleted', 'deleted' => true]);
        }

        // Standard optional section: soft-disable so it can be re-enabled later.
        DB::table('website_sections')->where('id', $section)->update([
            'is_enabled' => false,
            'updated_at' => now(),
        ]);

        $updated = DB::table('website_sections')->find($section);
        $result  = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }
}
