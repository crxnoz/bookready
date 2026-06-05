<?php

namespace App\Console\Commands;

use App\Models\MarketingLead;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * #125 — Daily support / lead digest.
 *
 * Two problems this solves:
 *   1. Marketing leads (exit-intent + contact-form captures that POST to
 *      /api/v1/leads) were landing in the `marketing_leads` table and
 *      notifying NO ONE — easy to miss real interest.
 *   2. Customer support emails go to hello@mybookready.com (a Hostinger
 *      mailbox). This digest is the daily forcing-function to check it.
 *
 * Runs daily via the scheduler (see routes/console.php). Sends only when
 * there's something new (or --force), so it never becomes ignorable noise.
 * The body always carries the standing "check hello@" reminder so the
 * inbox never goes silently unwatched.
 *
 * Delivery: Laravel Mail (resend driver, from hello@mybookready.com) to
 * ALERTS_EMAIL_TO (falls back to carrenoluis318@gmail.com) — same address
 * the uptime + error-log alerts use.
 */
class SendSupportDigest extends Command
{
    protected $signature = 'support:digest {--days=1 : Look-back window in days} {--force : Send even when there are no new leads}';

    protected $description = 'Email a daily digest of new marketing/support leads + an inbox-check nudge.';

    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $since = now()->subDays($days);

        $leads = MarketingLead::where('created_at', '>=', $since)
            ->orderByDesc('created_at')
            ->get();

        if ($leads->isEmpty() && ! $this->option('force')) {
            $this->info("No new leads in the last {$days}d — digest skipped.");
            return self::SUCCESS;
        }

        $to = env('ALERTS_EMAIL_TO') ?: 'carrenoluis318@gmail.com';

        // Group by source so "where did these come from" reads at a glance.
        $bySource = $leads->groupBy(fn ($l) => $l->source ?: 'unknown');
        $sourceSummary = $bySource
            ->map(fn ($group, $source) => "  • {$source}: " . $group->count())
            ->values()
            ->implode("\n");

        $lines = $leads->take(40)->map(function ($l) {
            $when = $l->created_at?->format('M j, g:ia') ?? '—';
            $src  = $l->source ?: 'unknown';
            return "  - {$l->email}  ({$src})  · {$when}";
        })->implode("\n");

        $overflow = $leads->count() > 40
            ? "\n  … and " . ($leads->count() - 40) . " more.\n"
            : '';

        $count = $leads->count();
        $subject = $count > 0
            ? "[BookReady] Daily digest — {$count} new lead" . ($count === 1 ? '' : 's')
            : '[BookReady] Daily digest — all quiet';

        $body = <<<TXT
BookReady daily digest — {$days}d window ending {$since->copy()->addDays($days)->format('M j, Y')}.

NEW LEADS / CONTACTS: {$count}

By source:
{$sourceSummary}

Detail:
{$lines}{$overflow}

────────────────────────────────────────────────────────
SUPPORT INBOX — check it daily:
  hello@mybookready.com  (Hostinger webmail: https://webmail.hostinger.com)

Customers email this address directly from the in-app "Help" links and the
legal pages. If you set up the Hostinger → Gmail forwarder, these will just
appear in your Gmail and you can ignore this reminder.
────────────────────────────────────────────────────────

— BookReady ops (automated daily digest)
TXT;

        try {
            Mail::raw($body, function ($m) use ($to, $subject) {
                $m->to($to)->subject($subject);
            });
            Log::info('support:digest sent', ['to' => $to, 'count' => $count]);
            $this->info("Digest sent to {$to} ({$count} leads).");
        } catch (\Throwable $e) {
            Log::error('support:digest failed', ['error' => $e->getMessage()]);
            $this->error('Digest send failed: ' . $e->getMessage());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
