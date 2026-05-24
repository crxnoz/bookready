<?php

namespace App\Exceptions;

/**
 * Raised when the public booking flow needs to charge a deposit but the
 * tenant's Stripe Connect account isn't ready (missing, not onboarded,
 * or restricted). The PublicBookingController catches this and returns
 * a friendly 422 to the client.
 */
class StripeConnectNotReadyException extends \RuntimeException
{
    public function __construct(string $message = 'This business is not ready to accept online payments yet.')
    {
        parent::__construct($message);
    }
}
