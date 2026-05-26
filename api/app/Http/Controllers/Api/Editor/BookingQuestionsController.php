<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 16 — Booking Questions (form builder).
 *
 * Custom questions the owner attaches to the public booking form, shown
 * below the customer-info step. Five types are supported:
 *   - text       short single-line response
 *   - textarea   multi-line response
 *   - checkbox   single agreement / opt-in toggle
 *   - dropdown   pick one of a curated list
 *   - image      single image upload (handled via the public-friendly
 *                uploads endpoint with kind='booking_answer')
 *
 * Scope:
 *   - 'all'      → applies to every booking
 *   - 'services' → applies only when the chosen service id is in service_ids
 *
 * Answers are snapshotted into appointments.question_answers at booking
 * time so a later edit or delete here does NOT rewrite history.
 */
class BookingQuestionsController extends Controller
{
    private const VALID_TYPES  = ['text', 'textarea', 'checkbox', 'dropdown', 'image'];
    private const VALID_SCOPES = ['all', 'services'];

    private function format(object $row): array
    {
        return [
            'id'          => (int)  $row->id,
            'label'       =>        $row->label,
            'type'        =>        $row->type,
            'options'     =>        $this->decodeJson($row->options),
            'help_text'   =>        $row->help_text   ?? null,
            'required'    => (bool) $row->required,
            'scope'       =>        $row->scope       ?? 'all',
            'service_ids' =>        $this->decodeJson($row->service_ids),
            'is_active'   => (bool) $row->is_active,
            'sort_order'  => (int)  $row->sort_order,
            'created_at'  =>        $row->created_at  ?? null,
            'updated_at'  =>        $row->updated_at  ?? null,
        ];
    }

    private function decodeJson($raw): array
    {
        if (is_array($raw)) return $raw;
        if (! is_string($raw) || $raw === '') return [];
        $d = json_decode($raw, true);
        return is_array($d) ? $d : [];
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('booking_questions')) {
            tenancy()->end();
            return response()->json([]);
        }

        $rows = DB::table('booking_questions')
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->values()
            ->all();

        tenancy()->end();

        return response()->json($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request, true);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('booking_questions')) {
            tenancy()->end();
            return response()->json(['message' => 'Booking questions not supported yet.'], 409);
        }

        $nextOrder = (int) DB::table('booking_questions')->max('sort_order') + 1;

        $id = DB::table('booking_questions')->insertGetId([
            'label'       => trim($validated['label']),
            'type'        => $validated['type'],
            'options'     => $this->serializeOptions($validated),
            'help_text'   => $validated['help_text']   ?? null,
            'required'    => $validated['required']    ?? false,
            'scope'       => $validated['scope']       ?? 'all',
            'service_ids' => $this->serializeServiceIds($validated),
            'is_active'   => $validated['is_active']   ?? true,
            'sort_order'  => $validated['sort_order']  ?? $nextOrder,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $row = DB::table('booking_questions')->find($id);
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $this->validatePayload($request, false);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('booking_questions')) {
            tenancy()->end();
            return response()->json(['message' => 'Question not found'], 404);
        }

        $row = DB::table('booking_questions')->find($id);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Question not found'], 404);
        }

        $data = ['updated_at' => now()];
        if (isset($validated['label']))                     $data['label']     = trim($validated['label']);
        if (isset($validated['type']))                      $data['type']      = $validated['type'];
        if (array_key_exists('help_text',   $validated))    $data['help_text'] = $validated['help_text'];
        if (array_key_exists('required',    $validated))    $data['required']  = (bool) $validated['required'];
        if (array_key_exists('scope',       $validated))    $data['scope']     = $validated['scope'];
        if (array_key_exists('is_active',   $validated))    $data['is_active'] = (bool) $validated['is_active'];
        if (array_key_exists('sort_order',  $validated))    $data['sort_order']= (int)  $validated['sort_order'];

        // options + service_ids — only touch when the caller sent them so a
        // partial PATCH doesn't blow away values we want to keep.
        if (array_key_exists('options', $validated)) {
            $data['options'] = $this->serializeOptions($validated);
        }
        if (array_key_exists('service_ids', $validated)) {
            $data['service_ids'] = $this->serializeServiceIds($validated);
        }

        DB::table('booking_questions')->where('id', $id)->update($data);
        $updated = DB::table('booking_questions')->find($id);
        $result  = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('booking_questions')) {
            tenancy()->end();
            return response()->json(['message' => 'Question not found'], 404);
        }

        $row = DB::table('booking_questions')->find($id);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Question not found'], 404);
        }

        DB::table('booking_questions')->where('id', $id)->delete();
        // appointments.question_answers is intentionally NOT touched — it's
        // a snapshot, deleting the question shouldn't rewrite history.

        tenancy()->end();

        return response()->json(['message' => 'Question deleted', 'deleted' => true]);
    }

    /**
     * Validate payload. On create the core fields are required; on update
     * everything is 'sometimes' so partial PATCH works.
     */
    private function validatePayload(Request $request, bool $isCreate): array
    {
        $req = $isCreate ? 'required' : 'sometimes';

        $rules = [
            'label'       => $req . '|string|max:255',
            'type'        => $req . '|string|in:' . implode(',', self::VALID_TYPES),
            'options'     => 'sometimes|nullable|array|max:50',
            'options.*'   => 'string|max:255',
            'help_text'   => 'sometimes|nullable|string|max:1000',
            'required'    => 'sometimes|boolean',
            'scope'       => 'sometimes|string|in:' . implode(',', self::VALID_SCOPES),
            'service_ids' => 'sometimes|nullable|array|max:200',
            'service_ids.*' => 'integer',
            'is_active'   => 'sometimes|boolean',
            'sort_order'  => 'sometimes|integer',
        ];

        return $request->validate($rules);
    }

    private function serializeOptions(array $validated): ?string
    {
        if (! array_key_exists('options', $validated)) return null;
        $opts = is_array($validated['options']) ? array_values(array_filter(
            array_map('strval', $validated['options']),
            fn ($v) => trim($v) !== '',
        )) : [];
        return empty($opts) ? null : json_encode($opts);
    }

    private function serializeServiceIds(array $validated): ?string
    {
        if (! array_key_exists('service_ids', $validated)) return null;
        $ids = is_array($validated['service_ids']) ? array_values(array_unique(array_map('intval', $validated['service_ids']))) : [];
        return empty($ids) ? null : json_encode($ids);
    }
}
