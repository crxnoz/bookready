# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BookReady is a multi-tenant SaaS for beauty businesses (salons, barbers, spas, nail/lash techs, solo pros).
Each tenant gets their own subdomain, public booking site, and editor at `app.bkrdy.me`.

- **`/api`** — Laravel 11 API (PHP 8.2, stancl/tenancy v3, Sanctum, Cashier, Resend)
- **`/web`** — Next.js 14 App Router (React 18, TypeScript, Tailwind, lucide-react)

## Live environments

- API: `https://api.bkrdy.me`
- Editor app: `https://app.bkrdy.me`
- Tenant sites: `https://{slug}.bkrdy.me` (example: `https://lushstudio.bkrdy.me`)
- Server: `root@198.211.116.44`, repo at `/var/www/bookready-api`
- pm2 process for the frontend: `bookready-web`

### Google OAuth (sign-in / sign-up)

- Credentials live in `/var/www/bookready-api/api/.env` as `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`. `GOOGLE_REDIRECT_URI` defaults to the production callback in `config/services.php` and does not need to be set.
- Authorized redirect URI registered in Google Cloud Console: `https://api.bkrdy.me/api/v1/auth/google/callback` (must match exactly).
- Scopes requested: `openid profile email` (see `GoogleAuthController::redirect`).
- After rotating creds: `php artisan optimize:clear` to flush cached config.
- If `GOOGLE_CLIENT_ID` is empty, `GoogleAuthController::credentialsConfigured()` short-circuits both `redirect()` and `callback()` and bounces the user back to `/login?google_error=...` or `/register?google_error=...` with a clear message instead of stranding them on Google's `invalid_client` page.
- `APP_BASE` is hardcoded to `https://app.bkrdy.me` in the controller. Local-dev OAuth is intentionally not wired — to test changes, deploy to prod or stub the controller.

## Common commands

### Frontend (`/web`)
```
npm run dev        # next dev on :3000
npm run build      # production build — run before committing UI changes
npm run lint       # next lint
```

### Backend (`/api`)
```
php artisan migrate --force                  # central DB
php artisan tenants:migrate --force          # all tenants
php artisan tenants:migrate --tenants=lushstudio --force   # single tenant
php artisan tenants:list
php artisan optimize:clear                   # clear config/route/view cache
php artisan tinker --execute='...'           # inline debugging (laravel/tinker is installed)
```

### Deploy
```
git push origin main
ssh root@198.211.116.44 'cd /var/www/bookready-api && \
  git pull origin main && \
  cd api && composer install --no-dev --optimize-autoloader && \
  rm -f bootstrap/cache/packages.php bootstrap/cache/services.php && \
  php artisan package:discover --ansi && \
  php artisan migrate --force && \
  php artisan tenants:migrate --force && \
  php artisan optimize:clear && \
  chown -R www-data:www-data bootstrap/cache storage && \
  cd ../web && npm install && npm run build && \
  pm2 restart bookready-web'
```

The `rm -f bootstrap/cache/packages.php services.php && package:discover` step is required: `package:discover` upserts into the existing file rather than clearing it, so stale entries from an earlier composer state (we've been bitten by `laravel/sail`, `laravel/sentinel`, `laravel/telescope` lingering from a long-gone `composer require`) survive every deploy and crash the app with `Class "...ServiceProvider" not found` on every request.

The final `chown -R www-data:www-data bootstrap/cache storage` is also required: when `composer install`, `php artisan tinker`, or any artisan command runs over SSH as `root`, it recreates `storage/logs/laravel.log` and `bootstrap/cache/*` as root-owned. The next request then 500s because php-fpm runs as `www-data` and can't write to root-owned files.

## Architecture essentials

### Multi-tenancy (stancl/tenancy v3, single MySQL instance)
- One **central** DB (`bookready_central`) holds `tenants`, `domains`, `users`, `personal_access_tokens`, `subscriptions`.
- Each tenant gets a **separate database** named `tenant_<tenant_id>` (prefix from `TENANCY_DB_PREFIX`).
- Tenant migrations live in `api/database/migrations/tenant/` and run via `tenants:migrate`. Central migrations live in `api/database/migrations/`.
- Tenant is resolved from request subdomain via `InitializeTenancyBySubdomain` middleware. The central API at `api.bkrdy.me` does **not** auto-resolve — editor controllers manually initialize tenancy from `$request->user()->tenant_id`.

### Two Stripe rails: Cashier vs Connect

Two **separate** Stripe integrations. Never mix them.

- **Cashier (SaaS subscriptions)** — tenants pay BookReady for Solo/Studio/Salon plans. Lives in central DB (`subscriptions`, `subscription_items`). Webhook: `POST /api/v1/webhooks/stripe`. Secret: `STRIPE_WEBHOOK_SECRET`. Frontend: `/editor/billing` (`BillingHub`) — plan picker + Stripe customer portal proxy.
- **Connect (customer appointment payments)** — booking clients pay tenants for deposits / full payment. Each tenant has their own Express account stored on tenant `payment_settings`. Webhook: `POST /api/v1/webhooks/stripe/appointments`. Secret: `STRIPE_APPOINTMENT_WEBHOOK_SECRET`. Service: `App\Services\StripeConnectService`. Controller: `StripeConnectController`. Frontend: `/editor/settings?tab=payments`.
- Connect state machine on `payment_settings.stripe_connect_status`: `not_connected → onboarding_started → pending → active` (or `restricted`). Reconciled via the `account.updated` event on the appointment webhook.
- The appointment webhook handles `account.updated`, `checkout.session.completed/expired`, `charge.refunded`, `charge.dispute.created/closed`, `payment_intent.payment_failed`, `payout.failed`. Each routes to an owner-facing `*OwnerMail` when something needs attention.

### Tenancy-safe controller pattern (critical — get this wrong and you leak)

All `/api/v1/editor/*` controllers follow this pattern:

```php
$tenant = Tenant::findOrFail($request->user()->tenant_id);
tenancy()->initialize($tenant);

// ... DB::table('...') queries here ...

$result = $this->format($row);   // flatten to PLAIN ARRAY first

tenancy()->end();

return response()->json($result);
```

**Why the order matters:** `tenancy()->end()` removes the dynamic `tenant` connection from the pool. If you return an Eloquent model instead of a flat array, `response()->json($model)` serializes *later*, calls `$model->getDateFormat()` → `$model->getConnection()` → `DB::connection('tenant')` → throws `Database connection [tenant] not configured`. We hit this exact bug on `BusinessProfileController` and fixed it by flattening with a `format()` helper (see any of `StaffController`, `GalleryItemsController`, `WebsiteTemplateController` for the canonical pattern).

Prefer `DB::table(...)` over Eloquent inside tenant scope. If you must use a model, call `->toArray()` (or hand-pluck attributes) **before** `tenancy()->end()`.

### Frontend ↔ API contract

- Editor API calls go through `web/lib/api.ts` `request<T>()`. Auth is a Sanctum **httpOnly cookie** — the token is no longer accessible to JS. `web/lib/auth.ts` only tracks `br_authed` (a "logged in" flag) and `br_tenant` ID in localStorage for UI state; the actual session is the cookie. `POST /auth/logout` revokes the cookie, then `clearAuth()` wipes the flags.
- **`getPublicSite()` MUST use `cache: 'no-store'`** — Next 14 fetch-caches by default and `export const dynamic = 'force-dynamic'` only controls page rendering, not the underlying fetch. Stale public sites were a real bug.
- Public lookup `GET /api/v1/public/sites/{slug}` returns the *entire* public payload (profile, services, hours, policies, staff, gallery, before_after, template settings + sections). The Fade Room template renders directly from this.

### Editor app structure

The editor (`app.bkrdy.me/editor/*`) uses a strict shell pattern.

- `web/components/editor/EditorShell.tsx` wraps every page → `SectionTopBar` → `EditorInnerNav` (sub-tabs) → `EditorPageHeader` (title + optional back link) → content. The wizard at `/editor/onboard` is the only editor page that opts out of the shell.
- `web/components/app/AppSidebar.tsx` is the left rail: Dashboard / Website / Bookings / Customers / Payments / Integrations / Settings. On mobile it collapses into a fixed z-40 slide-in drawer with backdrop.
- **`web/lib/editorNav.ts` is the single source of truth** for section + sub-tab structure. Add or rename a tab here, not in the hub component.
- **Hub pattern**: `/editor/website`, `/editor/payments`, `/editor/settings`, `/editor/billing` are each a *single page* with query-driven sub-tabs (`?tab=...`), not nested routes. Adding a sub-tab = edit the hub component + `editorNav.ts`; no new route file.

### Public site rendering — `web/app/(public)/site/[slug]/page.tsx`

- Dynamic route, `force-dynamic`, fetches `getPublicSite(slug)` with no-store.
- Resolves a template via `web/templates/registry.ts` (currently always `TheFadeRoomTemplate` regardless of tenant).
- `web/templates/thefaderoom/TheFadeRoomTemplate.tsx` is a single ~1500-line file that owns its scoped CSS (`<style>{TFR_CSS}</style>` with `.tfr-*` prefixed classes — do not leak outside).

### Public manage-booking flow

Token-gated client cancel / reschedule — no client account or login required. The token arrives in the booking confirmation email.

- `GET /api/v1/public/sites/{slug}/manage/{token}` → appointment snapshot + allowed actions.
- `POST .../manage/{token}/cancel`, `POST .../manage/{token}/reschedule` → client actions.
- Controller: `api/app/Http/Controllers/Api/PublicManageBookingController.php`.
- Server gates: terminal states (`cancelled`, `completed`, `no_show`) block everything; min-hours windows enforced from tenant `booking_settings.cancellation_window_hours` / `reschedule_window_hours`.
- Frontend: `web/app/(public)/site/[slug]/manage/[token]/page.tsx` (`ManageBookingPage`). Sibling token flow for tipping at `/site/{slug}/tip/{token}`.

### Website Editor — `/editor/website`

URL-driven sub-nav via `?tab=overview|header|content|additionals|footer`. The shell tab strip lives in `web/components/editor/EditorShell.tsx`; the page content + preview split lives in `web/components/editor/WebsiteHub.tsx`.

- **Two persistence layers** for template content:
  1. `template_settings.settings_json` (tenant table) — header config, tab labels, footer flags, about block, steps/before_appointment item arrays, additionals. Edited via `PATCH /editor/website/template`. Deep-merged on the backend (`App\Support\TemplateDefaults::mergeWithDefaults`) so older tenants pick up new keys automatically and partial updates don't clobber siblings.
  2. `website_sections` (tenant table) — per-section `is_enabled`/`is_locked`/`sort_order`/`title`. Locked sections (`header`, `book`, `footer`) cannot be hidden or deleted.
- **Other resources** are their own tables with full CRUD: `gallery_items`, `before_after_items` (both hard-delete; hide via `is_active` toggle).
- **Policies** use the existing `/editor/policies` endpoint — **never** duplicate policies into `template_settings`. `PoliciesEditorPanel` inside the Website hub uses the same `getEditorPolicies`/`updateEditorPolicies` API as the standalone `/editor/policies` page.

### Settings hub — `/editor/settings`

Single page, 8 query-tabs: `overview`, `business`, `preferences`, `booking`, `payments`, `notifications`, `account`, `danger`. Hub: `web/components/editor/SettingsHub.tsx`.

- **`account`** is **central-DB and skips tenancy init** — handles profile, password change, sign-out-everywhere. Password change preserves the current Sanctum token and revokes all others. Email change sends a security notice to **both** old and new addresses. Controller: `AccountController`.
- **`booking`** writes to tenant `booking_settings` (`auto_confirm_bookings`, `minimum_notice_minutes`, `max_days_ahead`, slot interval, slot release mode, `cancellation_window_hours`, `reschedule_window_hours`, `prevent_duplicate_client_bookings`). API exposes cleaner field names than the columns — see `BookingSettingsController` for the mapping. This is the **single source of truth** for cancel/reschedule windows; the public manage flow reads these.
- **`notifications`** writes to tenant `notification_settings`, including an `email_templates` JSON column for per-template subject/intro/signoff overrides. The per-tenant `sender_name` + `reply_to_email` from this table get applied to every appointment email via `AppointmentMailer::brand()`. Service: `NotificationSettingsService::templateCustomization()`. Customizable templates: `booking_request_client`, `appointment_confirmed`, `appointment_cancelled`, `appointment_rescheduled`, `appointment_reminder`.
- **`payments`** owns the Stripe Connect onboarding UI — calls `StripeConnectController`'s `/connect/start`, `/connect/status`, `/connect/refresh`, `/connect/dashboard-link`. Status badge colors and copy are driven by the Connect state machine.

### Payments Hub — `/editor/payments`

Single page, query-tabs: `overview` / `deposits` / `transactions` / `payouts`. Hub: `web/components/editor/PaymentsHub.tsx`. Built from appointment records + `payment_settings`. This is the owner's view of *customer* payments — completely independent of subscription billing (which lives at `/editor/billing`).

### Onboarding wizard — `/editor/onboard`

Full-screen 5-step flow (NOT wrapped in `EditorShell`): Business → Services → Hours → Policies → Stripe Connect (skippable). Component: `OnboardingWizard.tsx`. Dashboard redirects new tenants here until `tenants.onboarding_completed_at` is set; already-onboarded tenants bounce back to `/editor`. Uses the existing editor APIs — no special backend.

### Mailer system

Two services, intentionally separate:

- **`App\Services\PlatformMailer`** — transactional emails from BookReady itself (welcome on signup, first-booking celebration, etc.). BookReady branding.
- **`App\Services\AppointmentMailer`** — tenant-branded emails (booking confirmation, cancellation, reschedule, reminder, balance due, tip request, refund, late fee). `brand()` applies the tenant's `sender_name` + `reply_to_email`; `buildExtras()` enriches with staff name + add-on snapshot.

Mail classes in `api/app/Mail/` split by audience — `*ClientMail` (to the booking customer), `*OwnerMail` (to the tenant owner), `WelcomeToBookReadyMail` (platform). Don't cross-wire — owner alerts (`StripeConnectRestrictedMail`, `PayoutFailedOwnerMail`, `DisputeOpenedOwnerMail`, etc.) go through `PlatformMailer` because they're about the owner's relationship with BookReady, not a client interaction.

### Platform admin — `/admin` (web) + `/api/v1/admin/*` (API)

Gated by `users.is_admin` (central column) + middleware `App\Http\Middleware\EnsureAdmin`.

- `GET /admin/stats` — tenant count, plan distribution.
- `GET /admin/tenants`, `DELETE /admin/tenants/{id}` — list + purge.
- `GET/POST/PATCH/DELETE /admin/announcements` — platform-wide announcements. **The list endpoint is unauthenticated** so every owner's dashboard polls it without burning a session.

Frontend: `web/app/admin/page.tsx` + `web/components/admin/AdminPage.tsx`. Sign-out routes to `/login?next=/admin` so admins can come straight back.

### Naming gotcha: Steps & Before Your Appointment

Internal keys stay `settings.steps` and `settings.before_appointment` for backward compatibility, but **user-facing labels are "Advice" and "Timeline"**. Don't rename the keys.

### Template registry (one template for now)

`web/templates/registry.ts` maps a `template_key` → dynamic loader. Default fallback is `thefaderoom`. When adding a second template, both `PublicSite.profile.template_key` and the registry need updating; the rest of the public lookup is template-agnostic.

### Default content lives in PHP

`api/app/Support/TemplateDefaults.php` is the source of truth for default headings, tab labels, sample step/timeline items, and the `about` block. The deep-merge there is forward-compatible — adding a new optional key in defaults makes it appear for all tenants on next read without a data migration.

## Conventions

- **Editor controllers** live in `api/app/Http/Controllers/Api/Editor/`. Public controllers live in `api/app/Http/Controllers/Api/`.
- **Plain-array `format()` helper** at the top of every tenant controller (see `StaffController` for the reference).
- **`DB::table()` over Eloquent** inside tenant scope.
- **Schema::hasTable() fallback** in `PublicSiteController` for any new tenant table — the public lookup must never crash if some tenant hasn't migrated yet.
- **Scoped CSS for templates**: `.tfr-*` prefix on every class so template styling never bleeds into the editor app.
- **Tailwind palette** for the editor: `bg-cream`, `text-near-black`, `text-muted-text`, `bg-blush`, `bg-lavender`, thin `border-[rgba(18,18,18,0.10)]` borders. No generic blue SaaS chrome.
- **Lucide icons only**, never emojis in the UI.
- **`SaveBar` is currently duplicated** in three files (`WebsiteHub.tsx`, `SettingsHub.tsx`, `account/profile/page.tsx`) and `useSettingsForm` only lives in `WebsiteHub.tsx`. Consolidating into a shared module is a worthwhile cleanup. Until then, copy the `WebsiteHub` version when adding a new panel — it's the most complete and is already wired to the preview-refresh signal.
- **Preview auto-refresh**: every successful save in `WebsiteHub` bumps a shared `previewKey` that re-keys the preview iframe and appends `?preview=N` for cache-busting. New editors should call the parent's `saveSettings`/`toggleSection` helpers so the bump happens automatically.

## What NOT to touch without explicit reason

- **Both Stripe webhook routes** — `/api/v1/webhooks/stripe` (Cashier subscriptions, secret `STRIPE_WEBHOOK_SECRET`) and `/api/v1/webhooks/stripe/appointments` (Connect customer payments, secret `STRIPE_APPOINTMENT_WEBHOOK_SECRET`). Different controllers, different secrets — never swap.
- Sanctum auth flow, `/auth/*` routes
- `App\Services\SlotGenerator` (booking availability engine)
- Public booking endpoint `POST /api/v1/public/sites/{slug}/appointments`
- Email notification flow (`App\Services\AppointmentMailer`, `App\Mail\*`)
- SSL / domain config
- `web/components/app/AppSidebar.tsx` main sidebar (Dashboard / Website / Bookings / Customers / Payments / Integrations / Settings) and `web/lib/editorNav.ts` (single source of truth for all editor section + sub-tab structure — touch this when adding nav, not the components).

## Useful debugging entry points

- **Server logs**: `ssh root@198.211.116.44 'tail -200 /var/www/bookready-api/api/storage/logs/laravel.log'`
- **Per-tenant DB inspection**: `php artisan tinker --execute='$t=App\Models\Tenant::find("lushstudio"); tenancy()->initialize($t); DB::table("...")->get();'`
- **List tenants**: `php artisan tenants:list`
- **Curl public lookup** (no auth): `curl -s https://api.bkrdy.me/api/v1/public/sites/{slug} -H "Accept: application/json"`
