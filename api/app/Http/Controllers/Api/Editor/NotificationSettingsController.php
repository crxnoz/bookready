<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationSettingsController extends Controller
{
    private function format(object $row): array
    {
        return [
            'id'                                  => (int)   $row->id,
            'owner_booking_email_enabled'         => (bool)  $row->owner_booking_email_enabled,
            'client_booking_email_enabled'        => (bool)  $row->client_booking_email_enabled,
            'appointment_confirmed_email_enabled' => (bool)  $row->appointment_confirmed_email_enabled,
            'appointment_cancelled_email_enabled' => (bool)  $row->appointment_cancelled_email_enabled,
            'reminder_email_enabled'              => (bool)  $row->reminder_email_enabled,
            'reminder_hours_before'               => (int)   $row->reminder_hours_before,
            'reply_to_email'                      =>         $row->reply_to_email,
            'sender_name'                         =>         $row->sender_name,
            'created_at'                          =>         $row->created_at,
            'updated_at'                          =>         $row->updated_at,
        ];
    }

    private function ensureRowExists(): object
    {
        $row = DB::table('notification_settings')->first();
        if ($row) return $row;

        $id = DB::table('notification_settings')->insertGetId([
            'owner_booking_email_enabled'         => true,
            'client_booking_email_enabled'        => true,
            'appointment_confirmed_email_enabled' => true,
            'appointment_cancelled_email_enabled' => true,
            'reminder_email_enabled'              => false,
            'reminder_hours_before'               => 24,
            'reply_to_email'                      => null,
            'sender_name'                         => null,
            'created_at'                          => now(),
            'updated_at'                          => now(),
        ]);

        return DB::table('notification_settings')->where('id', $id)->first();
    }

    // GET /editor/settings/notifications
    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row    = $this->ensureRowExists();
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result);
    }

    // PATCH /editor/settings/notifications
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'owner_booking_email_enabled'         => 'sometimes|boolean',
            'client_booking_email_enabled'        => 'sometimes|boolean',
            'appointment_confirmed_email_enabled' => 'sometimes|boolean',
            'appointment_cancelled_email_enabled' => 'sometimes|boolean',
            'reminder_email_enabled'              => 'sometimes|boolean',
            'reminder_hours_before'               => 'sometimes|integer|min:1|max:720',
            'reply_to_email'                      => 'sometimes|nullable|email|max:255',
            'sender_name'                         => 'sometimes|nullable|string|max:120',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $this->ensureRowExists();

        $patch = ['updated_at' => now()];

        foreach ([
            'owner_booking_email_enabled', 'client_booking_email_enabled',
            'appointment_confirmed_email_enabled', 'appointment_cancelled_email_enabled',
            'reminder_email_enabled',
        ] as $f) {
            if (array_key_exists($f, $validated)) $patch[$f] = (bool) $validated[$f];
        }
        if (array_key_exists('reminder_hours_before', $validated)) {
            $patch['reminder_hours_before'] = (int) $validated['reminder_hours_before'];
        }
        if (array_key_exists('reply_to_email', $validated)) {
            $patch['reply_to_email'] = $validated['reply_to_email'];
        }
        if (array_key_exists('sender_name', $validated)) {
            $patch['sender_name'] = $validated['sender_name'];
        }

        DB::table('notification_settings')->update($patch);

        $row    = DB::table('notification_settings')->first();
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result);
    }
}
