<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerUser;
use App\Models\Tenant;
use App\Models\User;
use App\Services\CalendarEventService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Public iCalendar feeds (T1.1 + T1.3).
 *
 * No auth — the URL itself is the capability. The token (stored on
 * `users.ics_feed_token`) is the only thing that grants access; rotating
 * it revokes any existing subscription.
 *
 * Routes:
 *   GET /api/v1/cal/owner/{tenant}/{token}.ics       — T1.1 (owner)
 *
 * T1.3 (customer feed) will add a sibling `/cal/customer/{token}.ics`
 * route in a follow-up step that reuses CalendarEventService.
 *
 * Response shape: text/calendar; charset=utf-8 with a short cache window
 * so subscribed clients see new bookings reasonably quickly without
 * hammering us.
 */
class PublicCalendarFeedController extends Controller
{
    /** How far forward to publish. 90 days mirrors Stripe Checkout's session
     *  ceilings + the realistic horizon a tenant cares about. */
    private const HORIZON_DAYS = 90;

    /** Cache window. Calendar apps respect Cache-Control; 10 min strikes the
     *  balance between freshness (new booking → owner sees it) and load. */
    private const CACHE_SECONDS = 600;

    public function owner(Request $request, string $tenantSlug, string $token): Response
    {
        $tenantSlug = strtolower($tenantSlug);
        if (! preg_match('/^[a-z0-9-]+$/', $tenantSlug)) {
            return $this->notFound();
        }
        // Trim the .ics extension if the route doesn't already strip it.
        // Defensive — Laravel's route param will normally exclude the suffix
        // when the route declares it, but handle either form.
        $token = preg_replace('/\.ics$/i', '', $token);

        // Capability lookup — token must exist on a real owner whose tenant
        // matches the URL. Both checks together ensure no cross-tenant peek.
        if (! Schema::hasColumn('users', 'ics_feed_token')) {
            return $this->notFound();
        }
        $owner = User::where('ics_feed_token', $token)->first();
        if (! $owner || $owner->tenant_id !== $tenantSlug) {
            return $this->notFound();
        }

        $tenant = Tenant::find($tenantSlug);
        if (! $tenant) {
            return $this->notFound();
        }

        tenancy()->initialize($tenant);

        // Pull the business display name + address from the tenant's
        // business_profiles row — these enrich the VEVENT SUMMARY (in the
        // customer feed where multiple tenants merge) and LOCATION.
        $businessName    = null;
        $businessAddress = null;
        if (Schema::hasTable('business_profiles')) {
            $profile = DB::table('business_profiles')->first();
            if ($profile) {
                $businessName    = $profile->business_name ?? null;
                $businessAddress = self::composeAddress(
                    $profile->address_line ?? null,
                    $profile->city         ?? null,
                    $profile->state        ?? null,
                    $profile->zip          ?? null,
                );
            }
        }

        $vevents = [];
        if (Schema::hasTable('appointments')) {
            $today    = now()->format('Y-m-d');
            $horizon  = now()->addDays(self::HORIZON_DAYS)->format('Y-m-d');

            $rows = DB::table('appointments')
                ->whereBetween('appointment_date', [$today, $horizon])
                ->whereNotIn('status', ['cancelled'])
                ->orderBy('appointment_date')
                ->orderBy('start_time')
                ->get();

            foreach ($rows as $r) {
                $vevents[] = CalendarEventService::event([
                    'id'                => (int) $r->id,
                    'tenant_slug'       => $tenantSlug,
                    'appointment_date'  => $r->appointment_date,
                    'start_time'        => $r->start_time,
                    'end_time'          => $r->end_time,
                    'service_name'      => $r->service_name ?? 'Appointment',
                    'customer_name'     => $r->customer_name ?? null,
                    'status'            => $r->status,
                    'notes'             => $r->notes ?? null,
                    'business_name'     => null, // owner feed — they know which business it is
                    'business_address'  => $businessAddress,
                    'updated_at'        => isset($r->updated_at) ? (string) $r->updated_at : null,
                ]);
            }
        }

        tenancy()->end();

        $calName = $businessName ? "{$businessName} — BookReady" : 'BookReady bookings';
        $body    = CalendarEventService::calendar(
            calendarName: $calName,
            vevents:      $vevents,
            description:  'Upcoming appointments managed in BookReady.',
        );

        return $this->icsResponse($body, "bookings-{$tenantSlug}.ics");
    }

    /**
     * T1.3 — customer-scoped subscribable feed. Aggregates every
     * upcoming appointment the customer has across every BookReady
     * business they've booked at.
     *
     * Performance: walks ONLY the tenants in `customer_user_tenants`
     * (typically 1–3 per customer), not every tenant on the platform.
     * On a 2000-tenant platform that's the difference between O(N) and
     * O(1) per feed poll, and calendar apps poll on a 5–15 min cadence.
     *
     * If the customer has bookings in a tenant that hasn't yet been
     * stamped into the pivot (e.g. anonymous bookings made before
     * signup, awaiting self-heal on next /account visit), those won't
     * appear in the feed until /account fires the self-heal pass. Worth
     * the trade-off — heal-via-feed-poll would cross-write to tenant
     * DBs from a high-frequency public endpoint.
     */
    public function customer(Request $request, string $token): Response
    {
        // Strip optional .ics suffix the same way the owner route does.
        $token = preg_replace('/\.ics$/i', '', $token);

        if (! Schema::hasColumn('customer_users', 'ics_feed_token')) {
            return $this->notFound();
        }
        $customer = CustomerUser::where('ics_feed_token', $token)->first();
        if (! $customer) return $this->notFound();

        $tenantIds = DB::table('customer_user_tenants')
            ->where('customer_user_id', $customer->id)
            ->pluck('tenant_id')
            ->all();

        $vevents = [];
        $today   = now()->format('Y-m-d');
        $horizon = now()->addDays(self::HORIZON_DAYS)->format('Y-m-d');

        foreach ($tenantIds as $tenantId) {
            $tenant = Tenant::find($tenantId);
            if (! $tenant) continue;

            try {
                tenancy()->initialize($tenant);

                // The `finally` below handles tenancy()->end() on every
                // exit path including these early continues — no need to
                // call it explicitly here.
                if (
                    ! Schema::hasTable('clients')
                    || ! Schema::hasColumn('clients', 'customer_user_id')
                    || ! Schema::hasTable('appointments')
                ) {
                    continue;
                }

                // The pivot proves the customer booked here at some point.
                // Use the stamped customer_user_id on the per-tenant
                // clients row to find every appointment that's THEIRS,
                // not just every appointment under their email.
                $clientIds = DB::table('clients')
                    ->where('customer_user_id', $customer->id)
                    ->pluck('id')
                    ->all();

                if (empty($clientIds)) {
                    continue;
                }

                $businessName    = null;
                $businessAddress = null;
                if (Schema::hasTable('business_profiles')) {
                    $profile = DB::table('business_profiles')->first();
                    if ($profile) {
                        $businessName    = $profile->business_name ?? null;
                        $businessAddress = self::composeAddress(
                            $profile->address_line ?? null,
                            $profile->city         ?? null,
                            $profile->state        ?? null,
                            $profile->zip          ?? null,
                        );
                    }
                }

                $rows = DB::table('appointments')
                    ->whereIn('client_id', $clientIds)
                    ->whereBetween('appointment_date', [$today, $horizon])
                    ->whereNotIn('status', ['cancelled'])
                    ->orderBy('appointment_date')
                    ->orderBy('start_time')
                    ->get();

                foreach ($rows as $r) {
                    $vevents[] = CalendarEventService::event([
                        'id'                => (int) $r->id,
                        'tenant_slug'       => $tenantId,
                        'appointment_date'  => $r->appointment_date,
                        'start_time'        => $r->start_time,
                        'end_time'          => $r->end_time,
                        'service_name'      => $r->service_name ?? 'Appointment',
                        // Customer-side feed — they ARE the customer, so we
                        // suppress their own name from the SUMMARY (which
                        // is the customer's own name here, redundant) and
                        // surface the BUSINESS instead so the day view
                        // reads "Lush Studio: Haircut" not "Haircut · Jane".
                        'customer_name'     => null,
                        'status'            => $r->status,
                        'notes'             => null, // omit owner notes
                        'business_name'     => $businessName,
                        'business_address'  => $businessAddress,
                        'updated_at'        => isset($r->updated_at) ? (string) $r->updated_at : null,
                    ]);
                }
            } catch (\Throwable $e) {
                // Don't let one bad tenant break the customer's whole feed.
                Log::warning('Customer .ics feed: tenant scan failed', [
                    'tenant_id'        => $tenantId,
                    'customer_user_id' => $customer->id,
                    'error'            => $e->getMessage(),
                ]);
            } finally {
                // Always end tenancy — initialize/end is the contract,
                // skipping leaks the connection into the next iteration.
                tenancy()->end();
            }
        }

        $calName = trim(($customer->name ?: 'My') . ' bookings');
        $body    = CalendarEventService::calendar(
            calendarName: $calName,
            vevents:      $vevents,
            description:  'All your BookReady appointments, in one place.',
        );

        return response($body, 200)
            ->header('Content-Type',        'text/calendar; charset=utf-8')
            ->header('Cache-Control',       'public, max-age=' . self::CACHE_SECONDS)
            ->header('Content-Disposition', 'inline; filename="bookings.ics"');
    }

    /**
     * T1.2 — single-appointment .ics download. Gated by the appointment's
     * `manage_token` (same capability as the cancel/reschedule endpoints —
     * `PublicManageBookingController`). The customer clicks "Add to
     * calendar" in the confirmation email or on the manage page; their
     * browser downloads the file; iOS/Android offer to open it in the
     * default calendar app.
     *
     * Differs from the subscribable owner feed (above) in three ways:
     *   - one VEVENT, not many;
     *   - `Content-Disposition: attachment` so non-mobile browsers offer
     *     a save dialog instead of rendering text/calendar inline;
     *   - no cache (the event details may change up until the appointment
     *     starts, and the customer clicks at most once or twice).
     */
    public function appointment(Request $request, string $tenantSlug, string $token): Response
    {
        $tenantSlug = strtolower($tenantSlug);
        if (! preg_match('/^[a-z0-9-]+$/', $tenantSlug)) {
            return $this->notFound();
        }

        $tenant = Tenant::find($tenantSlug);
        if (! $tenant) return $this->notFound();

        tenancy()->initialize($tenant);

        if (! Schema::hasTable('appointments') || ! Schema::hasColumn('appointments', 'manage_token')) {
            tenancy()->end();
            return $this->notFound();
        }

        $row = DB::table('appointments')->where('manage_token', $token)->first();
        if (! $row) {
            tenancy()->end();
            return $this->notFound();
        }

        // Pull business details for the LOCATION line.
        $businessName    = null;
        $businessAddress = null;
        if (Schema::hasTable('business_profiles')) {
            $profile = DB::table('business_profiles')->first();
            if ($profile) {
                $businessName    = $profile->business_name ?? null;
                $businessAddress = self::composeAddress(
                    $profile->address_line ?? null,
                    $profile->city         ?? null,
                    $profile->state        ?? null,
                    $profile->zip          ?? null,
                );
            }
        }

        // Pre-build the manage URL inside tenant scope so the VEVENT can
        // link back to it. The customer is the audience here, so business
        // name goes in the SUMMARY (they may have multiple bookings).
        $manageUrl = \App\Support\BookingUrls::manage($tenantSlug, $row->manage_token);

        $vevent = CalendarEventService::event([
            'id'                => (int) $row->id,
            'tenant_slug'       => $tenantSlug,
            'appointment_date'  => $row->appointment_date,
            'start_time'        => $row->start_time,
            'end_time'          => $row->end_time,
            'service_name'      => $row->service_name ?? 'Appointment',
            'customer_name'     => $row->customer_name ?? null,
            'status'            => $row->status,
            'notes'             => null, // omit owner-private notes from the customer's calendar
            'business_name'     => $businessName,
            'business_address'  => $businessAddress,
            'manage_url'        => $manageUrl,
            'updated_at'        => isset($row->updated_at) ? (string) $row->updated_at : null,
        ]);

        tenancy()->end();

        $calName = $businessName ? "{$businessName} appointment" : 'BookReady appointment';
        $body    = CalendarEventService::calendar(
            calendarName: $calName,
            vevents:      [$vevent],
            description:  null,
        );

        return response($body, 200)
            ->header('Content-Type',        'text/calendar; charset=utf-8')
            // No cache — the customer clicks once and the file lands in
            // their calendar. Subsequent UPDATEs flow via VEVENT UID match
            // when they re-download, so we want a fresh fetch every time.
            ->header('Cache-Control',       'no-store, max-age=0')
            ->header('Content-Disposition', 'attachment; filename="appointment.ics"');
    }

    private function notFound(): Response
    {
        // We deliberately do NOT 404 with a JSON body — calendar clients
        // refresh aggressively and a 404 + clear message is plenty.
        return response('Calendar feed not found', 404)
            ->header('Content-Type', 'text/plain; charset=utf-8');
    }

    private function icsResponse(string $body, string $filename): Response
    {
        return response($body, 200)
            ->header('Content-Type',        'text/calendar; charset=utf-8')
            ->header('Cache-Control',       'public, max-age=' . self::CACHE_SECONDS)
            // Most clients ignore Content-Disposition for subscribed feeds —
            // it only matters for the one-shot download flow (T1.2). Setting
            // `inline` is safe for both.
            ->header('Content-Disposition', sprintf('inline; filename="%s"', $filename));
    }

    private static function composeAddress(?string $line, ?string $city, ?string $state, ?string $zip): ?string
    {
        $parts = array_filter([$line, $city, $state, $zip], fn ($s) => $s !== null && trim((string) $s) !== '');
        return $parts ? implode(', ', $parts) : null;
    }
}
