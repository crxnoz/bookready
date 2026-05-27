<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Phase 2 of the customer-accounts feature — password reset link for
 * customer accounts. Owner equivalent is PasswordResetMail.
 *
 * Same security profile as the owner flow:
 *   - The reset token in $resetUrl is the plain text; the corresponding
 *     hashed token is in password_reset_tokens table (which is shared
 *     with owner flow but keyed by email — no collision risk since the
 *     forgot endpoint scopes lookups to customer_users for this flow).
 *   - TTL enforced server-side.
 *   - Generic forgot response (don't leak which emails are registered).
 */
class CustomerPasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $customerName,
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
            view: 'mail.customer-password-reset',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
