<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 15 — receipt-number system.
 *
 * Every appointment that takes a real payment gets a human-friendly
 * receipt number (R-000001, R-000002, …). The number is tenant-scoped,
 * 6 digits zero-padded, monotonic. We store it on the appointment row
 * for fast lookup + search, and keep the next value as a single counter
 * row on payment_settings so issuance is atomic via select-for-update.
 *
 * Format choice: short prefix + 6-digit pad gives ~999k numbers per
 * tenant before we need to bump width — plenty for any solo or
 * small-team shop.
 */
return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('appointments') && ! Schema::hasColumn('appointments', 'receipt_number')) {
            Schema::table('appointments', function (Blueprint $table) {
                $table->string('receipt_number', 32)->nullable()->after('paid_at');
                $table->unique('receipt_number');
                // For the search-by-receipt path in TransactionsController.
                $table->index('receipt_number');
            });
        }

        if (Schema::hasTable('payment_settings') && ! Schema::hasColumn('payment_settings', 'next_receipt_number')) {
            Schema::table('payment_settings', function (Blueprint $table) {
                $table->unsignedInteger('next_receipt_number')->default(1)->after('currency');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('appointments') && Schema::hasColumn('appointments', 'receipt_number')) {
            Schema::table('appointments', function (Blueprint $table) {
                try { $table->dropUnique(['receipt_number']); } catch (\Throwable) {}
                try { $table->dropIndex(['receipt_number']);  } catch (\Throwable) {}
                $table->dropColumn('receipt_number');
            });
        }
        if (Schema::hasTable('payment_settings') && Schema::hasColumn('payment_settings', 'next_receipt_number')) {
            Schema::table('payment_settings', function (Blueprint $table) {
                $table->dropColumn('next_receipt_number');
            });
        }
    }
};
