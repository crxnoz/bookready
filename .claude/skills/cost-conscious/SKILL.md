---
name: cost-conscious
description: BookReady operating manual for token-efficient, convention-correct work — Grep-before-Read with targeted offsets, Edit-over-Write, parallel independent tool calls, no re-reads after Edit, explicit-file `git add`, new-commits-never-amend, `DEPLOY_OK`-only deploy success, `tenancy()->end()` flatten discipline with `DB::table()` + `Schema::hasTable` guards, atomic redeem + compensating release on every Stripe-failure branch, single-writer-per-column, status registry over inline color picking, `cn.ts` registration for custom Tailwind tokens, `getPublicSite()` `cache: 'no-store'`, and `check:ui` HARD-vs-soft handling. Use whenever the user asks for a "lean" / "tight" / "efficient" / "no-waste" / "token-conscious" / "cost-conscious" pass, says "follow repo conventions" or "do it the BookReady way", invokes `/cost-conscious`, or kicks off any multi-file change in this repo where you want the agent to default to the right altitude. Read once at task start, then operate from it silently — it is the rulebook, not a checklist to recite back.
---

# BookReady Cost-Conscious Operating Manual

Read this once at task start. Apply silently. Don't quote it back. Find your situation, run the checklist.

## mental model

1. Grep to locate, Read to confirm — never slurp.
2. Edit, not Write. Don't re-Read after.
3. Parallel independent tool calls in one turn.
4. Stage named files. New commits, never `--amend`.
5. `DEPLOY_OK` is the only deploy success signal.
6. On the money path, do the adversarial pass. The rules below each encode a shipped bug.

---

## general rules (always on)

### 1. Grep-first, Read-targeted

Locate the symbol with Grep, then Read with `offset`/`limit` for that region.

**Why:** `web/templates/thefaderoom/TheFadeRoomTemplate.tsx` is ~1500 lines; `PublicSiteController.php` is 720; `PublicBookingController::store()` runs past line 1100. A blind Read pulls thousands of tokens for what is usually a 30-line answer.

Good:
```
Grep(pattern="redeemAtomic", path="api/app/Services", output_mode="content", -C=3)
Read(file_path=".../CouponService.php", offset=120, limit=80)
```

Bad: `Read("PublicBookingController.php")` to find where coupons are redeemed.

### 2. Don't re-Read after Edit/Write

Edit and Write error on failure and the harness tracks file state. A confirmation Read is wasted tokens. Stated explicitly in the Read tool prompt.

### 3. Edit before Write

Write retransmits the entire file. The canonical tenant controller `StaffController.php` is 175 lines; a column-aware tweak in `PublicSiteController` touches one block. Reserve Write for new files or true full rewrites.

Bad: re-Writing `PublicSiteController.php` (720 lines) to flip one `Schema::hasColumn` branch.

### 4. Parallel independent, serial dependent

Batch unrelated reads/greps/bashes into one assistant turn. Chain only when step N+1 consumes step N's output. Five sequential single-tool messages to read five unrelated files is five wasted round-trips.

### 5. No subagent for focused edits

Task/Agent is for genuinely open-ended exploration ("audit every place that writes to `payment_status`"). A single Grep beats spawning an agent to "find the file with the payments toggle." Quick wins like commit `4552e5f` or `6a1220f` are 10–100 line targeted edits — wrong altitude for an Agent.

---

## situation: small fix (one file, < 50 lines)

- [ ] Grep for the exact symbol the user named. Don't start by reading the file.
- [ ] Read only the matched region (`offset` + `limit` around the hit, 30–80 lines).
- [ ] Edit, not Write. Do NOT re-Read after.
- [ ] If `web/`: `cd web && npm run check:ui` before commit.
- [ ] If `api/`: `php -l path/to/changed.php` before commit.
- [ ] Stage the explicit path. Never `git add -A` or `git add .`.
- [ ] Do not spawn a subagent.

## situation: big build (≥ 3 files)

- [ ] First turn: parallel reads of relevant `CLAUDE.md` sections, relevant `docs/bookready-design-system.md` sections, and the closest reference implementation:
  - Tenant controller: `api/app/Http/Controllers/Api/Editor/StaffController.php` (`format()` pattern, ~175 lines).
  - Editor screen: `web/components/editor/CouponsEditor.tsx` or `WaitlistEditor.tsx` (composes shared primitives, ~200 lines each).
  - Hub with sub-tabs: `web/components/editor/PaymentsHub.tsx` or `SettingsHub.tsx`.
  - Public payload extension: `api/app/Http/Controllers/Api/PublicSiteController.php` (every new column wrapped in `Schema::hasColumn`).
- [ ] Confirm the surface fits an existing pattern. Hubs use `?tab=` query params, not nested routes. New nav entries go in `web/lib/editorNav.ts`, not the hub component.
- [ ] State the file list back before building. Don't discover files mid-build.
- [ ] Data layer first (migration → controller → route), UI second.
- [ ] Edit on existing files (routes/api.php, editorNav.ts, registry maps), Write only for new files.

## situation: exploration ("where is X wired?")

- [ ] Grep is almost always enough. Try the obvious symbol/route/column name first.
- [ ] Narrow with `--type ts` / `glob: "api/**/*.php"` / more specific patterns before reading any file.
- [ ] Glob for file patterns, not Bash `find`/`ls -R`.
- [ ] Spawn an Agent only for multi-round audits. For "find the controller," one Grep wins.
- [ ] Stop when you have the answer. Don't over-read for "context."

## situation: about to commit

- [ ] Parallel `git status` (no `-uall`) + `git diff` to see exactly what you're staging. Working tree often has unrelated WIP — current snapshot shows 5 modified files spanning two efforts.
- [ ] Stage explicit paths: `git add api/app/.../Foo.php web/components/.../Foo.tsx`. Never `git add -A`, `git add .`, or `git add api/`.
- [ ] If a pre-commit hook fails: fix it, re-stage, **create a NEW commit**. Never `git commit --amend` — a failed hook means the commit didn't happen, so `--amend` mutates the *previous* commit and loses work. This is the moment after-adversarial-review follow-ups make amend tempting and wrong (see commit `1a916ca`).
- [ ] Never `--no-verify` / `--no-gpg-sign` unless the user explicitly asked.
- [ ] Commit message via heredoc with the `Co-Authored-By` trailer.
- [ ] If you touched a money path, list the adversarial-review checks you cleared in the body.

## situation: about to deploy

- [ ] Push first, then run the deploy heredoc from `CLAUDE.md` verbatim. Don't improvise.
- [ ] The script MUST contain `set -euo pipefail`. Without `-o pipefail`, a later edit that adds `npm run build 2>&1 | tail -8` will silently swallow build failures (pipeline exit code becomes `tail`'s, always 0) and pm2 restarts against a stale `.next`.
- [ ] Never pipe `npm run build` or `php artisan migrate` to `tail`/`head`. Redirect to a log file, then `tail` the file:
```bash
npm run build > /tmp/build.log 2>&1; tail -40 /tmp/build.log
```
- [ ] `rm -rf .next` before `npm run build` stays in — a killed prior build leaves a partial `.next/` next build can't recover from (`ENOENT: .next/package.json`, hit 2026-06-06).
- [ ] `rm -f bootstrap/cache/packages.php services.php && php artisan package:discover` stays in — `package:discover` upserts; without the rm, stale service providers (`laravel/sail`, `laravel/telescope`) crash every request.
- [ ] `chown -R www-data:www-data bootstrap/cache storage` stays in — SSH-as-root recreates log files root-owned, php-fpm runs as `www-data`, every request 500s.
- [ ] **The only success signal is the literal string `DEPLOY_OK` at the end of output.** Exit code 0 alone is not enough. pm2 "online" is not enough. No `DEPLOY_OK` = treat as failed regardless of what pm2 says.

## situation: about to touch a money path (Stripe, deposits, coupons, balance, payouts)

Highest-stakes surface in the repo. Apply every check.

- [ ] Confirm which Stripe rail. **Cashier** (SaaS subscriptions, `/api/v1/webhooks/stripe`, `STRIPE_WEBHOOK_SECRET`) and **Connect** (customer appointment payments, `/api/v1/webhooks/stripe/appointments`, `STRIPE_APPOINTMENT_WEBHOOK_SECRET`) are completely separate. Never swap controllers or secrets.
- [ ] Atomic redeem with compensating release. For any limited-use claim (`coupons.max_uses`, capacity), use `DB::transaction` + `SELECT ... FOR UPDATE` and re-check the limit *inside* the lock. Provide a `release*` compensator. `CouponService::redeemAtomic` is the reference.
- [ ] Call `release*` on **every** downstream failure branch — connect-not-ready, missing client_secret, generic throw. `PublicBookingController::store()` calls `releaseRedemption` in three distinct Stripe-failure branches per the adversarial review of `1a916ca`. Miss one = a one-shot code permanently burned by a network hiccup.
- [ ] Discount math: discounts apply to the **total**, not the deposit. `amount_due` = `total - discount - deposit_paid`, not `total - deposit_paid` (which silently moves the discount into the balance — "customer saves nothing"). This was the BLOCKER in `1a916ca`.
- [ ] Webhook idempotency: status writers re-check current state inside the UPDATE:
```php
DB::table('appointments')
    ->where('id', $id)
    ->where('payment_status', 'pending')  // guard inside the UPDATE
    ->update(['payment_status' => 'paid', ...]);
```
  `appointments:expire-pending-payments` (`ba71812`) is idempotent for this reason; embedded + hosted checkout share `stripe_checkout_session_id` as the dedupe key (`a9aadfb`).
- [ ] Adversarial pass before push. Document cleared checks in the commit body: wrong account/amount, capability bypass, webhook double-process, silent false-success, enumeration leak, race between concurrent redeems. Commits `1a916ca` and `404712c` are the templates. If you can't list three failure modes you considered, you didn't review.
- [ ] Never amend a money-path commit after review. New commit per fix.

## situation: about to add a new tenant DB read (column or table)

- [ ] Wrap it: `if (Schema::hasTable('coupons')) { ... }` or `Schema::hasColumn('services', 'image_url')`. Tenants migrate at different times — without the guard, every public booking site explodes the first time a slow-migrating tenant hits the lookup.
- [ ] `PublicSiteController.php` is the reference. Every new table read (service_staff, service_addons, booking_questions, blocked_dates, results_items, gallery_items, even `subscription_state` on central `tenants`) is guarded.
- [ ] If the field is sensitive (hash, secret, token), `unset()` it at the controller boundary too, on top of any model `$hidden`. See `PublicSiteController` line ~308 unsetting `site_password_hash` — survives a bad future refactor of `$hidden`.

## situation: about to write or edit a tenant controller

The pattern is fixed. Deviate and you'll leak or 500 on serialization.

```php
$tenant = Tenant::findOrFail($request->user()->tenant_id);
tenancy()->initialize($tenant);

$rows = DB::table('staff')->where('tenant_id', $tenant->id)->get();
$result = $rows->map(fn($r) => $this->format($r))->all();  // flatten FIRST

tenancy()->end();
return response()->json($result);
```

- [ ] `DB::table('foo')` over `Foo::query()`. `StaffController`, `PublicSiteController`, `CouponService` all use `DB::table` exclusively — no model events firing against central DB, no lazy-load surprises.
- [ ] Flatten via `format()` *inside* tenant scope. `response()->json($eloquentModel)` serializes *after* `tenancy()->end()` — the model's `getDateFormat()` → `getConnection()` then throws `Database connection [tenant] not configured`. Shipped as a bug on `BusinessProfileController`; don't reintroduce.
- [ ] Single-writer per column. If column X is owned by Editor Surface A, Editor Surface B may *read and link out* but must not include X in its save payload. Commit `6a1220f`: Date Drops and Booking Settings both wrote `booking_settings.slot_release_*`, so "edit Date Drops in one tab, save Booking Settings in another, watch your release strategy revert." Commit `9c22523` extended the same fix to `minimum_notice_minutes` / `max_days_ahead`.
- [ ] Editor controllers live in `api/app/Http/Controllers/Api/Editor/`. Public controllers in `api/app/Http/Controllers/Api/`.

## situation: about to build editor UI

- [ ] **SHARP.** No `rounded-*` anywhere in editor scope (`components/editor`, `components/app`, `components/ui`, `app/(editor)`). Hard-enforced by `cd web && npm run check:ui`.
- [ ] Tokens, never inline hex in chrome. Palette: `cream` / `near-black` / `muted-text` / `faint-text` / `blush` / `lavender`. Hairlines: `hairline-soft` / `hairline` / `hairline-strong`. Status: `success(-bg)` / `warning(-bg/-icon)` / `danger(-bg)`. Tinted borders via opacity (`border-danger/30`).
- [ ] Compose shared primitives from `web/components/ui/`: Button, Input, Textarea, Select, Toggle, StatusBadge, Card, Banner, Modal, Drawer, Toast (`useToast`), ConfirmDialog (`useConfirm`), EmptyState, AsyncBoundary, SaveBar. Reference: `CouponsEditor.tsx`, `WaitlistEditor.tsx` — each ~200 lines because chrome is shared.
- [ ] Section chrome: `TabShell` / `TabIntro` / `Section` / `CollapsibleSection` / `IconBox` from `web/components/editor/AvailabilitySections.tsx`.
- [ ] Status colors go through `web/lib/status.ts`: `<StatusBadge domain="…" status={value} />`. Never pick a color at the call site — that file replaced the ~5 divergent pill maps that made "Pending" simultaneously amber on Bookings, gray on Payments, and lavender on the Dashboard.
- [ ] Never `window.confirm` / `window.alert`. Use `useConfirm` / `useToast`. Never hand-roll a status pill or a Modal — `@headlessui/react` for a one-off when `Modal.tsx` exists is wrong.
- [ ] lucide-react icons only. No emojis.
- [ ] Sub-tab on an existing hub: add to `web/lib/editorNav.ts` (single source of truth) and render inside the hub. No new route file.
- [ ] After save handlers, bump the parent's `previewKey` so the preview iframe re-keys. See `WebsiteHub.tsx`.

## situation: about to add a Tailwind token

- [ ] Add to `web/tailwind.config.ts`.
- [ ] **If `text-*` or `tracking-*`, ALSO register in `web/lib/cn.ts`'s `extendTailwindMerge` classGroups.** Without this, `tailwind-merge` misclassifies `text-eyebrow` as a text-*color* utility and silently strips it when a real color follows in the same `cn()` call — the element loses its font-size and renders huge. Documented shipped bug in CLAUDE.md.
- [ ] Don't add a token to fix one inline `#hex` in an unrelated PR. The standing palette warns from `check:ui` are documented domain exemptions (calendar legend, chart fills, color-picker swatches). Let them be.

## situation: about to fetch the public site (frontend)

- [ ] `getPublicSite(slug)` MUST pass `cache: 'no-store'` to `fetch`. Next 14 fetch-caches by default and `export const dynamic = 'force-dynamic'` only controls page rendering, not the underlying fetch. Tenants saw stale public sites until this was fixed.

## situation: build / lint failed

- [ ] Read the error message. Do not start re-reading files.
- [ ] `check:ui` exit-1 = SHARP violation. Find the `rounded-*` and remove it.
- [ ] `check:ui` only printed warn counts (inline hex / `text-[Npx]` / palette utilities) = standing baseline. Don't fix mid-task — that pulls the PR into a sweep.
- [ ] `php -l` failed: Edit the named line. Don't Read the whole file.
- [ ] `next build` failed: read the *first* error in the trace. Subsequent errors are usually cascades.
- [ ] Fix forward. Don't `git reset --hard` or `git checkout --` without explicit user permission.

## situation: about to spawn a subagent

- [ ] Genuinely open-ended (multi-round, audit-style)? If no — direct tool calls.
- [ ] Good Agent use: "audit every place that writes to `payment_status`", "find all editor screens missing a `useConfirm` migration."
- [ ] Bad Agent use: "find the file where the payments toggle lives" (one Grep), "edit line 47 of `Foo.php`" (one Edit), "fix the typo in this commit message" (one Bash).

---

## what NOT to touch without explicit reason

- Both Stripe webhook routes — different controllers, different secrets, never swap.
- Sanctum auth flow, `/auth/*` routes.
- `App\Services\SlotGenerator` — singular exception is the Availability 2.0 roadmap (`docs/availability-2.0.md`).
- Public booking endpoint `POST /api/v1/public/sites/{slug}/appointments`.
- Email notification flow (`App\Services\AppointmentMailer`, `App\Mail\*`).
- SSL / domain config.
- `web/components/app/AppSidebar.tsx` and `web/lib/editorNav.ts` (touch `editorNav.ts` for nav, not the sidebar component).

---

## debugging entry points

- Server logs: `ssh root@198.211.116.44 'tail -200 /var/www/bookready-api/api/storage/logs/laravel.log'`
- Per-tenant DB: `php artisan tinker --execute='$t=App\Models\Tenant::find("lushstudio"); tenancy()->initialize($t); DB::table("...")->get();'`
- List tenants: `php artisan tenants:list`
- Curl public lookup: `curl -s https://api.bkrdy.me/api/v1/public/sites/{slug} -H "Accept: application/json"`

---

## reference materials in this codebase

- `CLAUDE.md` — project bible. Tenancy pattern, deploy script, what-not-to-touch, design-system non-negotiables.
- `docs/bookready-design-system.md` — UI build reference. SHARP rule, tokens, status registry, `cn.ts` gotcha, primitives list.
- `web/lib/status.ts` — single source of truth for status pills.
- `web/lib/cn.ts` — `extendTailwindMerge` registration for custom tokens.
- `web/scripts/ui-guardrails.mjs` — the check that fires on commit; read it before arguing with a HARD failure.
- `web/components/ui/` — primitives library.
- `web/components/editor/AvailabilitySections.tsx` — `TabShell`, `Section`, `CollapsibleSection`, `IconBox`.
- `api/app/Http/Controllers/Api/Editor/StaffController.php` — canonical tenant-controller layout.
- `api/app/Http/Controllers/Api/PublicSiteController.php` — canonical `Schema::hasTable` discipline + `unset()` guard.
- `api/app/Services/CouponService.php` + `PublicBookingController::store()` — atomic-redeem + release-on-every-failure pattern.
- Recent commits worth re-reading: `1a916ca` (coupons adversarial review), `6a1220f` (single-writer-per-column), `404712c` (hosted checkout failure-mode enumeration), `ba71812` (idempotent expiry cron), `a9aadfb` (embedded + hosted checkout dedupe).

---

## tone

Imperative. Terse. Operate from this doc, don't quote it. When a user asks for a change, apply the rules silently and only surface one in chat if it's load-bearing for their understanding ("I'm using Edit instead of Write because the file is 720 lines" is noise; "I'm adding a `Schema::hasColumn` guard so un-migrated tenants don't 500" is signal). If you find yourself about to `git add -A`, `--amend`, `Read` a 1500-line file, or `Write` over a 700-line controller for a 5-line change: stop and pick the cheaper tool.
