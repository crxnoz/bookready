<?php

namespace App\Services;

use App\Mail\FirstBookingOwnerMail;
use App\Mail\StaffInviteMail;
use App\Mail\WelcomeToBookReadyMail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * BookReady platform mail (welcome, billing receipts later, etc.).
 *
 * Intentionally distinct from AppointmentMailer + tenant notification
 * settings: these emails come from BookReady to the business owner and
 * are never controlled by per-tenant booking notification toggles.
 */
class PlatformMailer
{
    public static function sendWelcome(
        string $ownerEmail,
        string $ownerName,
        string $businessName,
        string $dashboardUrl = 'https://app.bkrdy.me/editor',
    ): void {
        try {
            Mail::to($ownerEmail)->send(new WelcomeToBookReadyMail(
                ownerName:    $ownerName,
                businessName: $businessName,
                dashboardUrl: $dashboardUrl,
            ));
        } catch (\Throwable $e) {
            // Never block signup on email failure — just log and move on.
            Log::error('[BookReady] WelcomeToBookReadyMail failed', [
                'owner_email' => $ownerEmail,
                'error'       => $e->getMessage(),
            ]);
        }
    }

    /**
     * Celebratory email when a tenant gets their very first booking.
     * Caller is responsible for the "is this the first?" check — pass
     * a plain-array $appt and the owner contact info from the central DB.
     */
    public static function sendFirstBookingCelebration(
        ?string $ownerEmail,
        string  $ownerName,
        string  $businessName,
        array   $appt,
    ): void {
        if (! $ownerEmail) return;
        try {
            Mail::to($ownerEmail)->send(new FirstBookingOwnerMail(
                appt:         $appt,
                businessName: $businessName,
                ownerName:    $ownerName,
            ));
        } catch (\Throwable $e) {
            // Never let a celebration email block anything.
            Log::error('[BookReady] FirstBookingOwnerMail failed', [
                'owner_email' => $ownerEmail,
                'error'       => $e->getMessage(),
            ]);
        }
    }

    /**
     * Wave D — staff accept-invite email. Sent from BookReady (platform
     * framing) because it's about account access, but names the business
     * so the staff member knows who invited them. Best-effort: a send
     * failure logs but never blocks the invite write (the owner can
     * resend).
     */
    public static function sendStaffInvite(
        string $staffEmail,
        string $staffName,
        string $businessName,
        string $acceptUrl,
    ): void {
        try {
            Mail::to($staffEmail)->send(new StaffInviteMail(
                staffName:    $staffName,
                businessName: $businessName,
                acceptUrl:    $acceptUrl,
            ));
        } catch (\Throwable $e) {
            Log::error('[BookReady] StaffInviteMail failed', [
                'staff_email' => $staffEmail,
                'error'       => $e->getMessage(),
            ]);
        }
    }
}
