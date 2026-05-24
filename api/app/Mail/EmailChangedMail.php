<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Security notification: sent when the email on a BookReady account
 * changes. Fired to BOTH the old AND the new email so:
 *   - the new address gets a "your account email is now this" receipt
 *   - the old address gets a "your account email was changed" alert
 *     (critical — if their account was hijacked, this is how they know)
 *
 * $recipientRole is 'old' or 'new', the template adjusts copy.
 */
class EmailChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $ownerName,
        public readonly string $oldEmail,
        public readonly string $newEmail,
        public readonly string $changedAt,
        public readonly string $recipientRole,    // 'old' | 'new'
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->recipientRole === 'old'
            ? 'Your BookReady account email was changed'
            : 'Confirming your BookReady account email';

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'mail.email-changed');
    }

    public function attachments(): array
    {
        return [];
    }
}
