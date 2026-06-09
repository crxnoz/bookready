<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Services\Sms\SmsQuotaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Editor surface for SMS usage tracking.
 *
 * One read-only endpoint that powers the editor's "SMS usage this
 * month" tile + the admin platform dashboard. No tenancy initialization
 * needed — quota counts live in the central notification_send_log so
 * we just resolve the tenant id from the authed owner and ask the
 * quota service for a snapshot.
 *
 * GET /api/v1/editor/sms/usage  →  SmsQuotaService::snapshot shape
 */
class SmsUsageController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? null;
        if (! $tenantId) {
            return response()->json(['message' => 'No tenant on this account.'], 422);
        }

        return response()->json(SmsQuotaService::snapshot((string) $tenantId));
    }
}
