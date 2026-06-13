<?php

namespace App\Mail;

use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Day-14 warning email for tenants stuck in STATE_PRE_TRIAL — they
 * signed up + verified + (maybe) onboarded but never reached
 * /checkout/trial card-capture. ReapPreTrialTenants sends this 7
 * days before the tenant gets hard-deleted.
 */
class PreTrialReaperWarningMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $ownerName,
        public string $tenantSlug,
        public Carbon $createdAt,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new \Illuminate\Mail\Mailables\Address('hello@mybookready.com', 'BookReady'),
            subject: 'Your BookReady site will be removed in 7 days',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.pre-trial-reaper-warning',
            with: [
                'ownerName'    => $this->ownerName,
                'tenantSlug'   => $this->tenantSlug,
                'createdAt'    => $this->createdAt,
                'restoreUrl'   => 'https://app.bkrdy.me/checkout/plan',
                'supportEmail' => 'hello@mybookready.com',
            ],
        );
    }
}
