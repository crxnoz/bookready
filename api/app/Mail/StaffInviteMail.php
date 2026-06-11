<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Wave D — staff accept-invite email.
 *
 * BookReady-platform framing (it's about account access), but it names
 * the inviting business so the recipient has context. The acceptUrl
 * carries the single-use token + tenant id; the matching login form
 * lives at app.bkrdy.me/staff/accept-invite.
 */
class StaffInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $staffName,
        public readonly string $businessName,
        public readonly string $acceptUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You have been invited to ' . $this->businessName . ' on BookReady',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.staff-invite',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
