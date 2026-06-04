<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * #159 — Unified-identity foundation.
     *
     * Adds a central `identities` table that owns the password. Existing
     * `users` (owners) and `customer_users` (customers) get an
     * identity_id FK so a single human can hold both roles under one
     * login.
     *
     * Backfill rules:
     *  - Build identities from users first → owner password wins when
     *    the same email exists on both sides.
     *  - Then link any customer_users rows whose email matches an
     *    existing identity (they auto-merge).
     *  - customer_users rows with a unique email get their own identity
     *    (cloned password + name from the customer row).
     *
     * Same-email rows in BOTH tables auto-merge to one identity with
     * both relations. This is the intended behavior — same human in
     * each case, currently siloed. Affected users (3 today: carrenoluis,
     * luisito, daysgraphicnyc) will use their OWNER password to sign in
     * going forward; the customer-side password is dropped. If a
     * customer used a different password, the forgot-password flow on
     * either /login or /account/login will reset the unified password.
     *
     * Idempotent: re-running the migration is safe — won't double-create.
     */
    public function up(): void
    {
        Schema::create('identities', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('password'); // bcrypt hash from users.password
            $table->string('name');
            $table->string('phone', 30)->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            // Nullable + indexed; FK to identities. Backfill runs below.
            $table->unsignedBigInteger('identity_id')->nullable()->after('id')->index();
            $table->foreign('identity_id')
                  ->references('id')->on('identities')
                  ->onDelete('set null');
        });

        Schema::table('customer_users', function (Blueprint $table) {
            $table->unsignedBigInteger('identity_id')->nullable()->after('id')->index();
            $table->foreign('identity_id')
                  ->references('id')->on('identities')
                  ->onDelete('set null');
        });

        // ── Backfill: users first (owner password wins on conflict) ──
        $owners = DB::table('users')
            ->select(['id', 'email', 'password', 'name', 'email_verified_at', 'created_at', 'updated_at'])
            ->whereNotNull('email')
            ->get();
        foreach ($owners as $u) {
            $email = strtolower($u->email);
            // Idempotency — skip if an identity exists already.
            $existing = DB::table('identities')->where('email', $email)->first();
            if ($existing) {
                DB::table('users')->where('id', $u->id)->update(['identity_id' => $existing->id]);
                continue;
            }
            $id = DB::table('identities')->insertGetId([
                'email'             => $email,
                'password'          => $u->password,
                'name'              => $u->name,
                'phone'             => null,
                'email_verified_at' => $u->email_verified_at,
                'created_at'        => $u->created_at,
                'updated_at'        => $u->updated_at,
            ]);
            DB::table('users')->where('id', $u->id)->update(['identity_id' => $id]);
        }

        // ── Backfill: customer_users — link to identity if email
        // matches one we already created, else create one. ────────────
        $customers = DB::table('customer_users')
            ->select(['id', 'email', 'password', 'name', 'phone', 'email_verified_at', 'created_at', 'updated_at'])
            ->whereNotNull('email')
            ->get();
        foreach ($customers as $c) {
            $email = strtolower($c->email);
            $identity = DB::table('identities')->where('email', $email)->first();
            if ($identity) {
                // Auto-merge — owner password already won. Backfill
                // phone from the customer row if the identity doesn't
                // have one (best-of-both-worlds for the merge).
                if (! $identity->phone && $c->phone) {
                    DB::table('identities')->where('id', $identity->id)->update(['phone' => $c->phone]);
                }
                // Carry email_verified_at if the owner side wasn't verified
                // but the customer side is — verification is intrinsic to
                // the email, not the role.
                if (! $identity->email_verified_at && $c->email_verified_at) {
                    DB::table('identities')->where('id', $identity->id)->update([
                        'email_verified_at' => $c->email_verified_at,
                    ]);
                }
                DB::table('customer_users')->where('id', $c->id)->update(['identity_id' => $identity->id]);
                continue;
            }
            // No owner with this email → create identity from customer row.
            $newId = DB::table('identities')->insertGetId([
                'email'             => $email,
                'password'          => $c->password,
                'name'              => $c->name,
                'phone'             => $c->phone,
                'email_verified_at' => $c->email_verified_at,
                'created_at'        => $c->created_at,
                'updated_at'        => $c->updated_at,
            ]);
            DB::table('customer_users')->where('id', $c->id)->update(['identity_id' => $newId]);
        }
    }

    public function down(): void
    {
        Schema::table('customer_users', function (Blueprint $table) {
            $table->dropForeign(['identity_id']);
            $table->dropColumn('identity_id');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['identity_id']);
            $table->dropColumn('identity_id');
        });
        Schema::dropIfExists('identities');
    }
};
