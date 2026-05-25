<?php

namespace App\Providers;

use App\Listeners\AugmentOutgoingMail;
use App\Models\Tenant;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Laravel\Cashier\Cashier;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Cashier bills Tenant, not User
        Cashier::useCustomerModel(Tenant::class);

        // Add text/plain alt + List-Unsubscribe to every outgoing email.
        // See AugmentOutgoingMail for rationale.
        Event::listen(MessageSending::class, AugmentOutgoingMail::class);
    }
}
