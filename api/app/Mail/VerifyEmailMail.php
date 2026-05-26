<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Phase S6 part 2 — verify-email link delivered after password-based
 * signup. Google OAuth signups skip this entirely because Google has
 * already verified the email on its end.
 */
class VerifyEmailMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $ownerName,
        public readonly string $verifyUrl,
        public readonly int    $ttlMins,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Verify your BookReady email',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.verify-email',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
