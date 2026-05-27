<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Phase 2 of the customer-accounts feature — welcome email sent the
 * first time a customer registers a BookReady account.
 *
 * Distinct from WelcomeToBookReadyMail (which targets business owners
 * — talks about workspaces, subscriptions, the editor). This one talks
 * to the end-customer: "save your bookings", "sign in to manage future
 * appointments." Friendly + low-pressure.
 */
class CustomerWelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $customerName,
        public readonly string $accountUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to BookReady',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.customer-welcome',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
