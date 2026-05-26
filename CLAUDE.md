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

- All editor API calls go through `web/lib/api.ts` `request<T>()` which sends the Sanctum bearer token from `web/lib/auth.ts`.
- **`getPublicSite()` MUST use `cache: 'no-store'`** — Next 14 fetch-caches by default and `export const dynamic = 'force-dynamic'` only controls page rendering, not the underlying fetch. Stale public sites were a real bug.
- Public lookup `GET /api/v1/public/sites/{slug}` returns the *entire* public payload (profile, services, hours, policies, staff, gallery, before_after, template settings + sections). The Fade Room template renders directly from this.

### Public site rendering — `web/app/(public)/site/[slug]/page.tsx`

- Dynamic route, `force-dynamic`, fetches `getPublicSite(slug)` with no-store.
- Resolves a template via `web/templates/registry.ts` (currently always `TheFadeRoomTemplate` regardless of tenant).
- `web/templates/thefaderoom/TheFadeRoomTemplate.tsx` is a single ~1500-line file that owns its scoped CSS (`<style>{TFR_CSS}</style>` with `.tfr-*` prefixed classes — do not leak outside).

### Website Editor — `/editor/website`

URL-driven sub-nav via `?tab=overview|header|content|additionals|footer`. The shell tab strip lives in `web/components/editor/EditorShell.tsx`; the page content + preview split lives in `web/components/editor/WebsiteHub.tsx`.

- **Two persistence layers** for template content:
  1. `template_settings.settings_json` (tenant table) — header config, tab labels, footer flags, about block, steps/before_appointment item arrays, additionals. Edited via `PATCH /editor/website/template`. Deep-merged on the backend (`App\Support\TemplateDefaults::mergeWithDefaults`) so older tenants pick up new keys automatically and partial updates don't clobber siblings.
  2. `website_sections` (tenant table) — per-section `is_enabled`/`is_locked`/`sort_order`/`title`. Locked sections (`header`, `book`, `footer`) cannot be hidden or deleted.
- **Other resources** are their own tables with full CRUD: `gallery_items`, `before_after_items` (both hard-delete; hide via `is_active` toggle).
- **Policies** use the existing `/editor/policies` endpoint — **never** duplicate policies into `template_settings`. `PoliciesEditorPanel` inside the Website hub uses the same `getEditorPolicies`/`updateEditorPolicies` API as the standalone `/editor/policies` page.

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
- **`SaveBar` + `useSettingsForm` hook** drive the dirty/saving/saved/error UX in every Website Editor panel. Reuse, don't reinvent.
- **Preview auto-refresh**: every successful save in `WebsiteHub` bumps a shared `previewKey` that re-keys the preview iframe and appends `?preview=N` for cache-busting. New editors should call the parent's `saveSettings`/`toggleSection` helpers so the bump happens automatically.

## What NOT to touch without explicit reason

- Stripe / Cashier wiring, the `/api/v1/webhooks/stripe` route
- Sanctum auth flow, `/auth/*` routes
- `App\Services\SlotGenerator` (booking availability engine)
- Public booking endpoint `POST /api/v1/public/sites/{slug}/appointments`
- Email notification flow (`App\Services\AppointmentMailer`, `App\Mail\*`)
- SSL / domain config
- `web/components/app/AppSidebar.tsx` main sidebar (Dashboard / Website / Bookings / Customers / Payments / Settings)

## Useful debugging entry points

- **Server logs**: `ssh root@198.211.116.44 'tail -200 /var/www/bookready-api/api/storage/logs/laravel.log'`
- **Per-tenant DB inspection**: `php artisan tinker --execute='$t=App\Models\Tenant::find("lushstudio"); tenancy()->initialize($t); DB::table("...")->get();'`
- **List tenants**: `php artisan tenants:list`
- **Curl public lookup** (no auth): `curl -s https://api.bkrdy.me/api/v1/public/sites/{slug} -H "Accept: application/json"`
