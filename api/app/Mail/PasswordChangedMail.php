<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Security confirmation: sent after a successful password change.
 * Always good practice — gives the legit user a heads-up so they can
 * act fast if someone else changed their password.
 */
class PasswordChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $ownerName,
        public readonly string $changedAt, // human-readable timestamp
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your BookReady password was changed',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.password-changed');
    }

    public function attachments(): array
    {
        return [];
    }
}
