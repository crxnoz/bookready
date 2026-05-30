<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * TCR-compliant SMS consent capture.
 *
 * sms_consent_at — the moment the customer ticked the "Send me SMS
 * reminders" checkbox at booking. Null = no consent. SmsService gates
 * outbound SMS for this appointment behind this column being non-null
 * (in addition to the global sms_optouts check).
 *
 * sms_consent_ip — the IP they checked from. Required by TCR auditors
 * to prove consent wasn't fabricated server-side. IPv6-capable.
 *
 * Consent is PER-APPOINTMENT, not global. A customer who booked twice
 * but only checked the box once consented only for the first booking.
 * If we later want SMS marketing (vs transactional), we'll need a
 * separate platform-wide opt-in capture — that's BookReady Marketing
 * scope, not this V1.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('appointments')) return;

        Schema::table('appointments', function (Blueprint $t) {
            if (! Schema::hasColumn('appointments', 'sms_consent_at')) {
                $t->timestamp('sms_consent_at')->nullable()->after('customer_phone');
            }
            if (! Schema::hasColumn('appointments', 'sms_consent_ip')) {
                $t->string('sms_consent_ip', 45)->nullable()->after('sms_consent_at');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('appointments')) return;

        Schema::table('appointments', function (Blueprint $t) {
            if (Schema::hasColumn('appointments', 'sms_consent_ip')) {
                $t->dropColumn('sms_consent_ip');
            }
            if (Schema::hasColumn('appointments', 'sms_consent_at')) {
                $t->dropColumn('sms_consent_at');
            }
        });
    }
};
