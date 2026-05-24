<?php

namespace App\Services;

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
}
