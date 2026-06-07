<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * demo:seed-appointments — fill a DEMO tenant with staff, customers and a
 * realistic spread of appointments so the editor dashboard (busy calendar,
 * revenue + booking charts, customer list, pending-requests inbox) looks
 * alive for marketing screenshots.
 *
 * Safe to re-run. Demo-seeded rows are tagged with the @demo.bookready.test
 * email domain so `--fresh` can wipe and rebuild without touching anything a
 * real owner created. Charts bucket by appointments.created_at and revenue
 * sums deposit_paid_amount + balance_paid_amount, so we spread created_at
 * across the window and set those paid fields on completed bookings.
 *
 * Example:
 *   php artisan demo:seed-appointments lushstudio --fresh
 */
class SeedDemoAppointments extends Command
{
    protected $signature = 'demo:seed-appointments
        {tenant : Tenant id, e.g. lushstudio}
        {--count=180 : Total appointments to create}
        {--days=120 : Days of history to spread behind today}
        {--upcoming=21 : Days forward for upcoming bookings}
        {--clients=36 : Customer pool size to ensure}
        {--fresh : Wipe existing appointments + demo-seeded customers/staff first}';

    protected $description = 'Populate a demo tenant with staff, customers and realistic appointments for marketing content.';

    private const DEMO_DOMAIN = '@demo.bookready.test';

    public function handle(): int
    {
        $tenantId = (string) $this->argument('tenant');
        $tenant = Tenant::find($tenantId);
        if (! $tenant) {
            $this->error("Tenant [{$tenantId}] not found. Run `php artisan tenants:list`.");
            return self::FAILURE;
        }

        tenancy()->initialize($tenant);

        try {
            $services = DB::table('services')->where('is_active', true)->get();
            if ($services->isEmpty()) $services = DB::table('services')->get();
            if ($services->isEmpty()) {
                $this->error("Tenant [{$tenantId}] has no services. Add services first.");
                return self::FAILURE;
            }

            if ($this->option('fresh')) {
                DB::table('appointments')->delete();
                DB::table('clients')->where('email', 'like', '%'.self::DEMO_DOMAIN)->delete();
                if (Schema::hasColumn('staff', 'email')) {
                    DB::table('staff')->where('email', 'like', '%'.self::DEMO_DOMAIN)->delete();
                }
                $this->line('Wiped existing appointments + demo-seeded customers/staff.');
            }

            $staffIds = $this->ensureStaff();
            $clients  = $this->ensureClients((int) $this->option('clients'), $services);

            $created = $this->seedAppointments($services, $staffIds, $clients);

            tenancy()->end();

            $this->newLine();
            $this->info("Done. Tenant [{$tenantId}]: {$created} appointments, "
                . count($staffIds) . ' staff, ' . $clients->count() . ' customers.');
            return self::SUCCESS;
        } catch (\Throwable $e) {
            tenancy()->end();
            $this->error('Failed: ' . $e->getMessage());
            $this->line($e->getFile() . ':' . $e->getLine());
            return self::FAILURE;
        }
    }

    /** Ensure at least a small team exists; returns all staff ids. */
    private function ensureStaff(): array
    {
        $existing = DB::table('staff')->pluck('id')->all();
        if (count($existing) >= 2) return $existing;

        $team = [
            ['name' => 'Ava Bennett',  'role' => 'Senior Stylist'],
            ['name' => 'Maya Cruz',    'role' => 'Color Specialist'],
            ['name' => 'Jordan Lee',   'role' => 'Stylist'],
            ['name' => 'Sofia Ramos',  'role' => 'Lash & Brow Artist'],
        ];
        $now = now();
        $hasEmail = Schema::hasColumn('staff', 'email');
        $hasPhone = Schema::hasColumn('staff', 'phone');
        foreach ($team as $i => $m) {
            $row = [
                'name'       => $m['name'],
                'role'       => $m['role'],
                'is_active'  => true,
                'sort_order' => $i,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            if ($hasEmail) $row['email'] = $this->slug($m['name']) . self::DEMO_DOMAIN;
            if ($hasPhone) $row['phone'] = $this->fakePhone();
            DB::table('staff')->insert($row);
        }
        return DB::table('staff')->pluck('id')->all();
    }

    /** Ensure a customer pool exists; returns the demo customers collection. */
    private function ensureClients(int $target, $services)
    {
        $first = ['Olivia','Emma','Sophia','Isabella','Mia','Charlotte','Amelia','Harper','Ella','Aria',
            'Layla','Nora','Hazel','Aurora','Savannah','Brooklyn','Bella','Camila','Penelope','Riley',
            'Zoey','Nova','Elena','Maya','Ruby','Lucy','Daniela','Naomi','Gabriela','Valentina',
            'Marcus','Daniel','Elijah','James','Liam','Noah','Lucas','Mason','Ethan','Leo'];
        $last = ['Carter','Reyes','Nguyen','Patel','Brooks','Foster','Morgan','Hayes','Bennett','Cole',
            'Diaz','Flores','Greene','Hughes','Iverson','Jensen','Khan','Lopez','Mercer','Novak',
            'Owens','Park','Quinn','Russo','Sharma','Torres','Underwood','Vance','Walsh','Young'];

        $existingDemo = DB::table('clients')->where('email', 'like', '%'.self::DEMO_DOMAIN)->get();
        if ($existingDemo->count() >= $target) return $existingDemo;

        $usedSlugs = DB::table('clients')->pluck('email')->map(fn ($e) => (string) $e)->all();
        $usedSet = array_flip($usedSlugs);
        $now = now();
        $hasVip   = Schema::hasColumn('clients', 'is_vip');
        $hasPrefS = Schema::hasColumn('clients', 'preferred_service_id');
        $hasPrefTime = Schema::hasColumn('clients', 'preferred_time_of_day');
        $hasPrefNotes = Schema::hasColumn('clients', 'preferences_notes');

        $notePool = [
            'Prefers a quieter appointment time.',
            'Sensitive scalp, go gentle on the rinse.',
            'Loves a warm-toned finish.',
            'Always rebooks for 6 weeks out.',
            'Allergic to certain fragrances, fragrance-free only.',
            'Bring extra coffee, she likes oat milk.',
            'Great referrer, sent three friends this year.',
            'Prefers texts over calls for reminders.',
        ];
        $prefNotesPool = [
            'Hair: fine, color-treated. Avoid heavy oils.',
            'Skin: combination, fragrance-sensitive.',
            'Likes natural-looking lash sets.',
            'Brows: prefers a soft arch.',
            'Cool blonde tones, no brass.',
        ];
        $times = ['morning','afternoon','evening'];

        $toCreate = $target - $existingDemo->count();
        for ($i = 0; $i < $toCreate; $i++) {
            // Build a unique name + email.
            $name = $first[array_rand($first)] . ' ' . $last[array_rand($last)];
            $email = $this->slug($name) . self::DEMO_DOMAIN;
            $guard = 0;
            while (isset($usedSet[$email]) && $guard < 50) {
                $name = $first[array_rand($first)] . ' ' . $last[array_rand($last)] . ' ' . chr(65 + random_int(0, 25));
                $email = $this->slug($name) . self::DEMO_DOMAIN;
                $guard++;
            }
            $usedSet[$email] = true;

            $row = [
                'name'       => $name,
                'email'      => $email,
                'phone'      => $this->fakePhone(),
                'notes'      => random_int(1, 100) <= 45 ? $notePool[array_rand($notePool)] : null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            if ($hasVip)   $row['is_vip'] = random_int(1, 100) <= 14;
            if ($hasPrefS) $row['preferred_service_id'] = random_int(1, 100) <= 40
                ? (int) $services[array_rand($services->all())]->id : null;
            if ($hasPrefTime) $row['preferred_time_of_day'] = random_int(1, 100) <= 50
                ? $times[array_rand($times)] : null;
            if ($hasPrefNotes) $row['preferences_notes'] = random_int(1, 100) <= 35
                ? $prefNotesPool[array_rand($prefNotesPool)] : null;

            DB::table('clients')->insert($row);
        }

        return DB::table('clients')->where('email', 'like', '%'.self::DEMO_DOMAIN)->get();
    }

    private function seedAppointments($services, array $staffIds, $clients): int
    {
        $count    = (int) $this->option('count');
        $daysBack = (int) $this->option('days');
        $daysFwd  = (int) $this->option('upcoming');
        $now      = Carbon::now();

        $hasReceipt = Schema::hasColumn('appointments', 'receipt_number');
        $hasManage  = Schema::hasColumn('appointments', 'manage_token');
        $hasBalance = Schema::hasColumn('appointments', 'balance_paid_amount');
        $hasMethod  = Schema::hasColumn('appointments', 'payment_method');
        $hasRefund  = Schema::hasColumn('appointments', 'refunded_amount');

        // Receipt counter continues past any existing numbers.
        $receipt = 1;
        if ($hasReceipt) {
            $maxR = DB::table('appointments')->whereNotNull('receipt_number')
                ->selectRaw("MAX(CAST(REPLACE(receipt_number,'R-','') AS UNSIGNED)) as m")->value('m');
            $receipt = ((int) $maxR) + 1;
        }

        // Weight a quarter of customers as regulars so retention looks real.
        $clientIds  = $clients->pluck('id')->all();
        $regularIds = array_slice($clientIds, 0, max(6, intdiv(count($clientIds), 4)));
        $clientById = $clients->keyBy('id');

        $rows = [];
        $lastBooked = [];

        for ($i = 0; $i < $count; $i++) {
            $offset = random_int(-$daysBack, $daysFwd);
            $date = $now->copy()->addDays($offset)->startOfDay();
            if ((int) $date->dayOfWeek === 0 && random_int(0, 4) !== 0) $date->subDay(); // thin out Sundays

            $service  = $services[array_rand($services->all())];
            $price    = $service->price !== null ? (float) $service->price : (float) random_int(45, 160);
            $duration = (int) ($service->duration ?? 60);
            $deposit  = $service->deposit !== null && (float) $service->deposit > 0
                ? (float) $service->deposit
                : round($price * 0.30, 2);
            if ($deposit > $price) $deposit = round($price * 0.30, 2);

            // Start slot 9:00–17:30 on the hour/half-hour; keep end by 19:00.
            $slot   = random_int(18, 35); // 18*30=9:00 .. 35*30=17:30
            $startM = $slot * 30;
            if ($startM + $duration > 19 * 60) $startM = max(9 * 60, 19 * 60 - $duration);
            $startT = sprintf('%02d:%02d:00', intdiv($startM, 60), $startM % 60);
            $endM   = $startM + $duration;
            $endT   = sprintf('%02d:%02d:00', intdiv($endM, 60), $endM % 60);

            $apptAt = $date->copy()->addMinutes($startM);
            $isPast = $apptAt->lt($now);
            $isToday = $date->isToday();

            // Status by timing.
            if ($isPast && ! $isToday) {
                $r = random_int(1, 100);
                $status = $r <= 78 ? 'completed' : ($r <= 88 ? 'cancelled' : 'no_show');
            } elseif ($isToday) {
                $status = $apptAt->lt($now) ? 'completed' : (random_int(1, 100) <= 80 ? 'confirmed' : 'pending');
            } else {
                $status = random_int(1, 100) <= 68 ? 'confirmed' : 'pending';
            }

            // Payment snapshot.
            $pay = [
                'payment_status'      => 'none',
                'deposit_required'    => false,
                'deposit_amount'      => null,
                'deposit_paid_amount' => null,
                'amount_due'          => null,
                'paid_at'             => null,
            ];
            $receiptNumber = null;
            $balancePaid = null;
            $method = null;
            $refunded = null;
            $refundedAt = null;

            $assignReceipt = function () use (&$receipt, $hasReceipt) {
                if (! $hasReceipt) return null;
                return 'R-' . str_pad((string) $receipt++, 6, '0', STR_PAD_LEFT);
            };

            if ($status === 'completed') {
                $method = random_int(1, 100) <= 22 ? 'cash' : null;
                $pay['payment_status'] = 'paid';
                $pay['deposit_required'] = true;
                $pay['deposit_amount'] = $deposit;
                $pay['deposit_paid_amount'] = $deposit;
                $balancePaid = round($price - $deposit, 2);
                $pay['amount_due'] = 0;
                $pay['paid_at'] = $apptAt->copy()->addMinutes($duration);
                $receiptNumber = $assignReceipt();
            } elseif ($status === 'confirmed') {
                if (random_int(1, 100) <= 65) {
                    $pay['payment_status'] = 'deposit_paid';
                    $pay['deposit_required'] = true;
                    $pay['deposit_amount'] = $deposit;
                    $pay['deposit_paid_amount'] = $deposit;
                    $pay['amount_due'] = round($price - $deposit, 2);
                    $pay['paid_at'] = $apptAt->copy()->subDays(random_int(1, 9));
                    $receiptNumber = $assignReceipt();
                }
            } elseif ($status === 'pending') {
                if (random_int(1, 100) <= 50) {
                    $pay['payment_status'] = 'pending_payment';
                    $pay['deposit_required'] = true;
                    $pay['deposit_amount'] = $deposit;
                    $pay['amount_due'] = $price;
                }
            } elseif ($status === 'no_show') {
                // Forfeited deposit kept.
                $pay['payment_status'] = 'deposit_paid';
                $pay['deposit_required'] = true;
                $pay['deposit_amount'] = $deposit;
                $pay['deposit_paid_amount'] = $deposit;
                $pay['amount_due'] = round($price - $deposit, 2);
                $pay['paid_at'] = $apptAt->copy()->subDays(random_int(1, 9));
                $receiptNumber = $assignReceipt();
            } elseif ($status === 'cancelled') {
                if ($hasRefund && random_int(1, 100) <= 18) {
                    $pay['payment_status'] = 'refunded';
                    $pay['deposit_required'] = true;
                    $pay['deposit_amount'] = $deposit;
                    $pay['deposit_paid_amount'] = $deposit;
                    $refunded = $deposit;
                    $refundedAt = $apptAt->copy()->subDays(random_int(1, 5));
                    $receiptNumber = $assignReceipt();
                }
            }

            // Customer: regulars chosen more often.
            $cid = random_int(1, 100) <= 55 && $regularIds
                ? $regularIds[array_rand($regularIds)]
                : $clientIds[array_rand($clientIds)];
            $client = $clientById[$cid];

            // created_at ("booked at") drives the charts; spread it before the appt.
            $bookedAt = $apptAt->copy()->subDays(random_int(0, 14))->subHours(random_int(0, 6));
            if ($bookedAt->gt($now)) $bookedAt = $now->copy()->subHours(random_int(1, 120));

            $staffId = $staffIds ? $staffIds[array_rand($staffIds)] : null;

            if (in_array($status, ['completed', 'confirmed'], true)) {
                $key = $cid;
                if (! isset($lastBooked[$key]) || $apptAt->gt($lastBooked[$key])) {
                    $lastBooked[$key] = $apptAt->copy();
                }
            }

            $row = [
                'client_id'                => $cid,
                'service_id'               => (int) $service->id,
                'staff_id'                 => $staffId,
                'addons_subtotal_cents'    => 0,
                'customer_name'            => $client->name,
                'customer_email'           => $client->email,
                'customer_phone'           => $client->phone,
                'service_name'             => $service->name,
                'service_price'            => $price,
                'service_duration_minutes' => $duration,
                'appointment_date'         => $date->toDateString(),
                'start_time'               => $startT,
                'end_time'                 => $endT,
                'status'                   => $status,
                'payment_status'           => $pay['payment_status'],
                'deposit_required'         => $pay['deposit_required'],
                'deposit_amount'           => $pay['deposit_amount'],
                'deposit_paid_amount'      => $pay['deposit_paid_amount'],
                'amount_due'               => $pay['amount_due'],
                'currency'                 => 'USD',
                'paid_at'                  => $pay['paid_at'] ? $pay['paid_at']->toDateTimeString() : null,
                'notes'                    => null,
                'created_at'               => $bookedAt->toDateTimeString(),
                'updated_at'               => $bookedAt->toDateTimeString(),
            ];
            if ($hasReceipt) $row['receipt_number'] = $receiptNumber;
            if ($hasManage)  $row['manage_token'] = Str::random(40);
            if ($hasBalance) $row['balance_paid_amount'] = $balancePaid;
            if ($hasMethod && $method) $row['payment_method'] = $method;
            if ($hasRefund && $refunded !== null) {
                $row['refunded_amount'] = $refunded;
                $row['refunded_at'] = $refundedAt?->toDateTimeString();
            }

            $rows[] = $row;
        }

        foreach (array_chunk($rows, 100) as $chunk) {
            DB::table('appointments')->insert($chunk);
        }

        // Sync last_booked_at on customers.
        foreach ($lastBooked as $cid => $when) {
            DB::table('clients')->where('id', $cid)->update(['last_booked_at' => $when->toDateTimeString()]);
        }

        return count($rows);
    }

    private function slug(string $name): string
    {
        return Str::slug($name, '.') ?: 'guest.' . random_int(1000, 9999);
    }

    private function fakePhone(): string
    {
        // 555 prefix is reserved for fiction, so these never reach a real line.
        return sprintf('+1 (555) %03d-%04d', random_int(200, 999), random_int(0, 9999));
    }
}
