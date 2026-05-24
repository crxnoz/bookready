<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $ownerName,
        public readonly string $resetUrl,
        public readonly int    $ttlMins,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset your BookReady password',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.password-reset',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
