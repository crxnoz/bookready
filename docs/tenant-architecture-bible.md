# BookReady Tenant Dashboard — Architecture Bible

> **Definitive source of truth for the entire tenant-facing application** (`app.bkrdy.me/editor/*`), authored as the pre-work for a UX consistency overhaul.
> This is a platform inventory + information-architecture audit, **not** a UX or visual-design review. It documents every screen, section, tab, panel, card, table, modal, drawer, form, field, action, workflow, and relationship in the system, and ends with ten consolidated inventories + a consistency report + a simplification roadmap.
>
> **Scope.** The *tenant* (business-owner) app only. Out of scope: the public booking site (`{slug}.bkrdy.me`), the marketing site, the platform-admin console (`/admin`), and the customer self-service account area (`app.bkrdy.me/account`) — except where the tenant app links into them.
>
> **Method.** Built by reading the live source (Next.js 14 App Router under `web/`, Laravel API under `api/`). Every surface is cited to its file. Where a feature is advertised but not built ("Coming soon"), it is flagged. Where the same concept is implemented inconsistently, it is flagged in §UX-Consistency.
>
> **Legend.** 🟢 Live · 🟡 Partial / has gaps · ⚪ Coming-soon placeholder (no functionality) · ⚠️ Inconsistency or bug.

---

## How to read this document

1. **§1 Main Navigation** — the seven sidebar destinations, each with Purpose / Primary Goal / Frequency / Criticality.
2. **§2 Global Shell** — the chrome wrapping every page (sidebar, top bar, inner-nav, page header, banners, guards).
3. **§3 Information Architecture Tree** — the full `Nav → Section → Tab → Component → Action` hierarchy.
4. **§4–§11 Area Deep-Dives** — one section per nav item (+ Availability, Billing, Onboarding), screen-by-screen: tabs, page composition, tables, forms, modals, drawers, cards, workflows.
5. **§12–§21 Consolidated Inventories** — the ten required deliverables: Sitemap, Nav Tree, Screen Inventory, Component Inventory, Workflow Inventory, Form Inventory, Modal Inventory, Data-Input Inventory, UX-Consistency Report, Simplification Roadmap.

---

# §1. Main Navigation

The left sidebar (`web/components/app/AppSidebar.tsx`, `MAIN_NAV`) exposes **seven** destinations. (Note: the sidebar hard-codes its own list and does **not** consume `editorNav.ts`; see ⚠️ in §UX-Consistency.) Two more tenant surfaces — **Billing** (`/editor/billing`) and the **Onboarding wizard** (`/editor/onboard`) — exist but are **not** in the sidebar.

| # | Nav item | Route | Purpose | Primary user goal | Frequency | Criticality |
|---|----------|-------|---------|-------------------|-----------|-------------|
| 1 | **Dashboard** | `/editor` | Owner command center — live business snapshot + triage + first-run gate | "What needs my attention today?" | **Daily** (landing page) | **Core** |
| 2 | **Website** | `/editor/website` | Control the public booking site (template, content, galleries, policies, footer) | "Make my site look right and say the right things, then publish" | Weekly | **Core** |
| 3 | **Bookings** | `/editor/bookings` | Services, availability, appointments, staff, booking form | "Run my schedule and define what's bookable" | **Daily** | **Core** |
| 4 | **Customers** | `/editor/customers` | Lightweight CRM — directory, segmentation, history | "Find a client and act on them" | Daily | Important |
| 5 | **Payments** | `/editor/payments` | Owner's view of *customer* payments (Stripe Connect) | "What have I collected, who owes me, when do I get paid?" | Weekly | Important |
| 6 | **Integrations** | `/editor/integrations` | Catalog of third-party connections (only Stripe live) | "Connect another tool" | Rare | Secondary |
| 7 | **Settings** | `/editor/settings` | Business-wide config (profile, prefs, booking rules, payments, notifications, account, danger) | "Change how the business runs" | Monthly | **Core** |
| — | **Billing** ⚠️ not in sidebar | `/editor/billing` | The tenant's *own* SaaS subscription (Stripe Cashier) | "Pick/upgrade my plan, manage my card" | Rare | Important |
| — | **Onboarding** (full-screen) | `/editor/onboard` | First-run 5-step setup wizard | "Get set up in 3 minutes" | Once | **Core (first run)** |

**Two-Stripe rule (foundational).** *Payments* + *Integrations→Stripe* = **Stripe Connect** (customers pay the tenant). *Billing* = **Stripe Cashier** (the tenant pays BookReady). They never share data, endpoints, or terminology.

---

# §2. Global Shell

Every `/editor/*` route is wrapped in two layers.

### 2.1 Outer chrome — `web/app/(editor)/layout.tsx` → `EditorGuard` → `AppShell`

- **`EditorGuard`** (`web/components/editor/EditorGuard.tsx`) — auth gate. If not logged in → `/login`. Calls `GET /auth/me`; honors a backend `redirect_url` (e.g. unverified / no-card users get routed away); on 401 → `clearAuth()` + `/login`. Full-screen "Loading…" until the tenant slug resolves.
- **`AppShell`** (`web/components/app/AppShell.tsx`) — holds `drawerOpen` state (mobile). Renders: `EmailVerifyBanner` (top) → mobile hamburger row (`md:hidden`, logo + "BookReady") → page content. Esc closes the drawer; body-scroll-locks while open; closes on route change.
- **`AppSidebar`** (`web/components/app/AppSidebar.tsx`) — desktop 220px rail + mobile slide-in drawer (280px, backdrop). Brand lockup (logo + "BookReady" + `{slug}.bkrdy.me`), a "Menu" eyebrow, the 7 nav items (active = `bg-near-black text-white`), and bottom actions: **View Site** (opens `{slug}.bkrdy.me`), **Copy Link** (clipboard, ⚠️ silent — no toast), **Sign Out** (`POST /auth/logout` → `clearAuth()` → `/login`).

### 2.2 Inner page shell — `EditorShell` (`web/components/editor/EditorShell.tsx`)

Composition, top→bottom:
```
SectionTopBar    — section eyebrow ("WEBSITE", "BOOKINGS", …)        [layout/SectionTopBar.tsx]
EditorInnerNav   — sub-tab strip (Overview · Content · …)            [layout/EditorInnerNav.tsx]
EditorPageHeader — H1 title + subtitle [+ back link] [+ actions]     [layout/EditorPageHeader.tsx]
<page content>   — flex-1, overflow-y-auto, bg-cream
```
- Props: `title`, `subtitle`, `pageHeader` (bool), `innerNav` (bool), `topBar` (bool), `actions` (ReactNode), `activeInnerTab`. Defaults pull from the section config.
- **Section + tab source of truth:** `web/lib/editorNav.ts` (`EDITOR_SECTIONS`, `sectionForPath`, `hrefForInnerTab`). Two nav modes: **`query-tab`** (Website, Customers, Payments, Settings — `?tab=`) and **`route`** (Bookings — separate routes).
- **Back-link rule:** shown on any non-hub-root page except the dashboard; points at the section hub.
- **`EditorInnerNav`** renders nothing when a section has no inner tabs (Dashboard). Tabs can be flagged `soon` → muted + "Soon" pill (still navigable).

### 2.3 Cross-cutting global elements

- **`EmailVerifyBanner`** (`web/components/app/EmailVerifyBanner.tsx`) — amber strip on every page when `email_verified_at == null`; "Verify your email… Resend". No dismiss; disappears when verified. ⚠️ Gates site publishing (see Settings→Preferences).
- **Platform announcements** ("BookReady Feed") — shown on the **Dashboard only** (`AnnouncementsBlock`), one item at a time, dismiss persisted in `localStorage['br_ann_dismissed_<id>']`. Source: unauthenticated `GET /platform/announcements`.
- **WelcomeTour** (`web/components/editor/WelcomeTour.tsx`) — first-run 4-step modal on the Dashboard; gated by `GET /editor/account/welcome-state`, dismiss → `POST /editor/account/welcomed`.
- **No toast system exists.** ⚠️ There is **no** `sonner`/`react-hot-toast`/`<Toaster>` anywhere. All feedback is **inline**: the `SaveBar` triad (muted "Unsaved changes" / green "Saved" ~1.8s / red error) + red `AlertCircle` banners + status pills. Any redesign assuming toasts must build them from scratch.
- **SaveBar pattern** — `useSettingsForm<T>(initial, save)` (deep-compare dirty, `doSave`, auto-clear "Saved" after 1800ms) + a `SaveBar` UI. ⚠️ Duplicated across `WebsiteHub.tsx`, `SettingsHub.tsx`, `account/profile/page.tsx`; `useSettingsForm` lives only in `WebsiteHub`. No auto-save anywhere; no discard/reset button anywhere.

---

# §3. Information Architecture Tree

`Nav → Section → Tab → key Component(s) → primary Action(s)`. �unicode markers: 🟢 live, ⚪ coming-soon, ⚠️ note.

```
/editor  (Dashboard)  🟢  [no inner nav]
  ├─ Greeting hero + Today's tip
  ├─ Announcements feed (dismiss)            → read / dismiss
  ├─ Setup checklist (until 100%)            → deep-links to Business/Services/Availability/Website/Payments
  ├─ Next-appointment hero + 4 KPI cards     → /editor/appointments, /payments, /customers
  ├─ Today's schedule (≤8)                   → ?focus={id}
  ├─ Needs attention (pending / payment)     → ?status=pending / ?tab=transactions
  ├─ Quick actions (5)                       → new appt / availability / block date / add customer / payments
  ├─ Revenue chart (T/W/M/Y + drill-in)      → in-place point detail
  ├─ Booking snapshot / Upcoming / WeekStrip / Money snapshot
  ├─ Business health (avg ticket / return / no-show) + New customers + Top spenders
  ├─ Growth opportunities + Recent activity
  └─ WelcomeTour modal (first run)

/editor/website  (Website hub, query-tab)  — WebsiteHub.tsx (4,144 lines) + always-on Preview pane
  ├─ ?tab=overview      🟢 template/status, theme color/pattern, section visibility+reorder, change-template, quick links
  ├─ ?tab=header        🟢 "Top Banner" — announcement bar, cover+avatar, 11 header buttons (toggle+URL)
  ├─ ?tab=introduction  ⚪ ComingSoonPanel
  ├─ ?tab=content       🟢 tab labels+visibility, Advice list, Timeline list, About block
  ├─ ?tab=gallery       🟢 Gallery manager + Before&After manager (collections + item modals)
  ├─ ?tab=policies      🟢 6 named policies + custom sections (writes business_policies)
  ├─ ?tab=additionals   🟢 "Extras" — Thank-you + FAQ(≤4) + Reviews
  ├─ ?tab=announcements ⚪ ComingSoonPanel
  ├─ ?tab=footer        🟢 brand label, name override, subtext, 4 visibility toggles
  └─ ?tab=seo           ⚪ "Get Found on Google" (bespoke coming-soon card)

/editor/bookings  (Bookings, route-mode inner nav)
  ├─ /editor/bookings   🟢 Overview — AppointmentsDashboard (stats strip, 4 hub cards, 5-item preview w/ confirm/decline)
  ├─ /editor/services   🟢 ServicesEditor — service list (drag-reorder) + Categories panel + Add-ons panel + Packages⚪
  ├─ /editor/availability 🟢 Availability hub (8 sub-tabs — see below)
  ├─ /editor/appointments 🟢 AppointmentsEditor — 6 filters, card list + Week grid + Month calendar, inline form, payment dialogs
  ├─ /editor/staff      🟢 StaffEditor — staff cards + per-card Schedule (hours + blocked dates)
  ├─ /editor/booking-form 🟢 BookingFormEditor — custom question list + question modal
  ├─ /editor/waitlist   🟢 WaitlistEditor (also a tab in Availability)
  └─ (/editor/hours     ⚠️ redirect → /editor/availability; HoursEditor.tsx orphaned)

/editor/availability  (Availability hub, query-tab inside the page)  — Availability 2.0
  ├─ ?tab=calendar     🟢 Smart Calendar (month grid, per-date override modal)
  ├─ ?tab=drops        🟢 Date Drops (release strategy + custom drops)
  ├─ ?tab=capacity     🟢 Capacity (global default + per-staff caps)
  ├─ ?tab=after-hours  🟢 After Hours (fee, extension, latest, access tier, cap)
  ├─ ?tab=squeeze-ins  🟢 Squeeze-Ins (config + request queue)
  ├─ ?tab=waitlist     🟢 Waitlist (queue table)
  ├─ ?tab=requests     🟢 Availability Requests inbox (approve/suggest/decline)
  └─ ?tab=advanced     🟢 Weekly schedule (legacy) + Schedule limits + Blocked dates + links

/editor/customers  (Customers hub, query-tab)
  ├─ ?tab=overview     ⚠️ identical to list (no real overview)
  ├─ ?tab=list         🟢 CustomersEditor — KPI cards, search, 9 filter chips, customer card-list, detail drawer
  ├─ ?tab=loyalty      ⚪ ComingSoonPanel
  ├─ ?tab=accounts     ⚪ ComingSoonPanel
  └─ ?tab=reviews      ⚪ ComingSoonPanel

/editor/payments  (Payments hub, query-tab)  — read/monitor only; money actions live in Appointments
  ├─ ?tab=overview     🟢 KPI cards, Stripe banners, Stripe-dashboard launcher, recent activity
  ├─ ?tab=deposits     🟢 appointment list filtered by payment state
  ├─ ?tab=transactions 🟢 searchable ledger + status filters
  ├─ ?tab=payouts      🟢 Stripe Connect bank payouts (live from Stripe)
  └─ ?tab=settings     ⚠️ external link → /editor/settings?tab=payments

/editor/integrations  🟢(catalog) — IntegrationsHub: Stripe (live) + ~11 coming-soon tiles across 5 categories

/editor/settings  (Settings hub, query-tab)
  ├─ ?tab=overview      🟢 card grid (7 destinations)
  ├─ ?tab=business      🟢 identity/contact/address  (business_profiles)
  ├─ ?tab=preferences   🟢 timezone/format/defaults/comms + site visibility+password
  ├─ ?tab=booking       🟢 booking rules + enforcement (booking_settings + business_policies)
  ├─ ?tab=payments      🟢 Stripe Connect state machine + deposit/tax/fees config
  ├─ ?tab=notifications 🟢 email toggles + reminders + per-template overrides + sender + test-send
  ├─ ?tab=account       🟢 profile / password / sign-out-everywhere (central DB)
  ├─ ?tab=integrations  ⚠️ redirects → /editor/integrations
  └─ ?tab=danger        🟢 pause mirror + CSV export + delete account (modal)

/editor/billing  ⚠️ not in nav — BillingHub: current subscription + plan picker + Stripe portal
/editor/onboard  (full-screen, no EditorShell) — 5-step wizard (Business→Services→Hours→Policies→Stripe)
```

---

# §4. Dashboard — `/editor`

**File:** `web/app/(editor)/editor/page.tsx` (~2,285 lines; `DashboardPage` → `EditorShell pageHeader={false}` → `DashboardBody`). ⚠️ The real dashboard body is inline in `page.tsx`; the similarly-named `AppointmentsDashboard.tsx` is actually the **Bookings Overview** (see §6.1).

**Purpose / Goal / Frequency / Criticality:** command center · "triage my day" · daily (landing) · Core.

**Data load:** one `Promise.all` (`/auth/me`, business, services, hours, policies, Stripe-connect status, appointments `{limit:200}`, platform announcements). **First-run gate:** if `business.onboarding_completed_at == null` → `router.replace('/editor/onboard')`.

### Composition (render order)
- **Greeting hero** — `{Good morning/afternoon/evening}, {firstName}.` + subline `{weekday} · N appointments today [· $X scheduled]`. Header actions: **View website**, **Create appointment** (→ `/editor/appointments`), **Add customer** (→ `/editor/customers`). **Today's tip** strip (deterministic daily, 30-tip array).
- **Announcements feed** — first item only; dismissible (localStorage).
- **Setup checklist** (until 100%) — 5 items: Business profile, Services added, Business hours, Booking policies, Stripe payments → each deep-links + shows done/todo + %.
- **Layer 1 Today:** Next-appointment hero (live countdown, re-renders 30s) + 4 KPI cards (Appointments today, Scheduled today $, New customers 7d, Needs attention [amber]) + Today's schedule (≤8 rows, `?focus={id}`).
- **Layer 2 Needs attention:** empty = green "all caught up"; else `PendingRequestsTile` (amber → `?status=pending`) + `PaymentIssuesTile` (red → `?tab=transactions`). **Quick actions** row (5 pills).
- **Layer 3 Performance:** Revenue chart (SVG area chart, T/W/M/Y toggle [default M], click-point → in-place detail panel of ≤8 paid appts); Booking snapshot (status bars); Upcoming (tomorrow/weekend); WeekStrip (7 day cells w/ density dots → `?date=`); Money snapshot (this week/month/outstanding/deposits pending).
- **Layer 4 Health:** avg ticket / return rate / no-show rate; New customers (≤4); Top spenders (top 3 this month).
- **Layer 5 Growth:** Growth opportunities (≤3 generated nudges); Recent activity (6 latest by created_at).
- **WelcomeTour** modal (first run, 4 steps). ⚠️ Tour references "Settings → Domain" and "Billing tab" which don't exist in nav.

### Tables / cards / states
- No true tables — card/row lists. **`StatusPill`** (dashboard-local): confirmed=green, pending=amber, completed=solid black, cancelled/no_show=red. ⚠️ This is a *second* StatusPill palette vs the Bookings one.
- **Loading:** "Loading your dashboard…"; **Error:** white card + red `AlertCircle`.

### Workflows starting here
Triage pending → confirm; jump to appt (`?focus`); resolve payment issue; finish setup; first-run tour; create appt / add customer; preview/share site; week-density browse; revenue drill-in; read/dismiss announcement; resend verification.

---

# §5. Website hub — `/editor/website`

**File:** `web/components/editor/WebsiteHub.tsx` (4,144 lines — owns hub + every panel/dialog/atom). Always-on **Preview pane** (right column, iframe to live site, Mobile/Desktop/Refresh; auto-bumps `?preview=N` on settings saves). Toolbar: **Copy Link**, **View Site**.
⚠️ **Dead/legacy components NOT mounted here:** `GalleryEditor.tsx`, `PoliciesEditor.tsx`, `BusinessForm.tsx`, `LivePreview.tsx` — the hub re-implements all inline. `/editor/business`, `/editor/policies`, `/editor/gallery` are redirects (⚠️ `/editor/business` → `?tab=business` which is NOT a valid tab → silently falls back to Overview).

**Purpose / Goal / Frequency / Criticality:** control the public storefront · "make my site right, publish" · high at launch / medium ongoing · Core.

### Tabs (verbatim labels; ⚠️ label ≠ key ≠ component)
| Nav label | `?tab=` | State | Renders |
|---|---|---|---|
| Overview | `overview` | 🟢 | `OverviewPanel` |
| **Top Banner** | `header` | 🟢 | `HeaderPanel` (code calls it "Header/Hero") |
| Introduction | `introduction` | ⚪ | ComingSoonPanel |
| Content | `content` | 🟢 | `ContentTabsPanel` |
| Gallery | `gallery` | 🟢 | `GalleryManagerPanel` + `ResultsManagerPanel` |
| Policies | `policies` | 🟢 | `PoliciesEditorPanel` |
| **Extras** | `additionals` | 🟢 | `AdditionalsPanel` |
| Announcements | `announcements` | ⚪ | ComingSoonPanel |
| Footer | `footer` | 🟢 | `FooterPanel` |
| **Get Found on Google** | `seo` | ⚪ | bespoke `SeoComingSoonPanel` |

### Per-tab composition (rebuild detail)
- **Overview** — Template+status panel (active template, "N sections visible"); **Theme picker** (accent/background swatches *or* Bottega pattern tiles; single-click saves; `null`=default); Seasonal-themes teaser (⚪ disabled pills); **Change Template** block (radio list of 7 templates from `web/lib/templates.ts`, amber reset warning, confirm → `selectActiveTemplate` → hard reload); Quick-links grid; **Section visibility** panel (per-section Eye/EyeOff toggle, Up/Down reorder via `sort_order` swap, jump-to-editor; locked: header/book/footer = "Always on"); Bookings-data links; Public-URL display.
- **Top Banner / Header** — `useSettingsForm`, saves `{header}`. Fields: Announcement bar text (200) + Show toggle; Cover image (`ImageUploadField` 16/9); Avatar (square, conditional on manifest); **11 header buttons** (Book/Call/Email/Message/Directions/Instagram/TikTok/YouTube/Facebook/Pinterest/WhatsApp) each = toggle + conditional URL field (blank=inherit). SaveBar.
- **Content** — (1) "Tab Labels & Visibility": 7 tab-name inputs (Book/Gallery/Policy/About/Results/Advice/Timeline, ≤40) + per-section Eye/EyeOff (book locked). (2) **Advice** & (3) **Timeline** — `InstructionsEditorPanel` (section heading ≤120 + card kicker ≤40 + ≤8 items each {title ≤120, body ≤500}; reorder/delete; ≥1 required; validation gates SaveBar). (4) **About** — photos (1 or 3 slots, manifest-gated), heading, body (≤2000), ≤3 highlights.
- **Gallery** — **GalleryManagerPanel** (inline heading + ≤3 collections × ≤6 images; `GalleryGroupDialog` + `GalleryItemDialog`) and **ResultsManagerPanel** ("Before & After", ≤3 collections × ≤6 pairs; `ResultsItemDialog`). Card-grid thumbnails w/ Edit/Hide/Delete hover overlay. ⚠️ Item saves don't auto-refresh preview (heading saves do).
- **Policies** — inline heading + 6 named policy textareas (cancellation/late/no_show/deposit/reschedule/extra_notes, ≤2000) + ≤2 custom sections × ≤3 items. Writes `business_policies` via `/editor/policies` (shared single source; never duplicated into template_settings).
- **Extras / Additionals** — one SaveBar, 3 panels: Thank-you (toggle + eyebrow + title + body + signature); FAQ (toggle + heading + ≤4 Q/A); Reviews (toggle + heading + N reviews {quote, name, location, rating 1–5}).
- **Footer** — brand label, name override (conditional), subtext, 4 toggles (contact links / hours / quick book / BookReady badge).

### Forms / Modals / Tables
- **Forms:** Business profile (links out to Settings), Policies (6 + custom), Gallery item, Before/After item, 3 inline heading mini-forms. `ImageUploadField` = drag/drop + file picker (jpeg/png/webp/heic) + "Use URL instead"; inline error.
- **Modals (centered overlay):** `GalleryGroupDialog` (heading req.), `GalleryItemDialog` (image req. + collection/title/category/caption/alt/visible), `ResultsItemDialog` (before+after req.). Collection rename is inline. Deletes use native `confirm()`.
- **Tables:** none — card grids. Empty/loading/at-cap states per manager.

### Workflows
Edit & publish a section (save = live, preview re-keys); add a gallery image; edit policies; change template (hard reload); set brand color (instant).

---

# §6. Bookings — `/editor/bookings` (route-mode)

Inner nav: Overview · Services · Availability · Appointments · Staff · Booking Form · Waitlist. (`/editor/hours` ⚠️ orphaned redirect.)

## §6.1 Bookings Overview — `AppointmentsDashboard.tsx`
⚠️ Misnamed file (it's the Bookings hub, not the dashboard). Stats strip (Pending/Today/This Week — deep-link, ⚠️ shows literal "None" while loading); 4 hub cards (Appointments [pending badge] / Services / Availability / Staff); Appointments Preview (≤5; pending rows get **Confirm** [→ status=confirmed] / **Decline** [→ confirm() → delete→soft-cancel]). `StatusPill` here: pending=blush, confirmed=lavender (⚠️ different palette from dashboard).

## §6.2 Services — `ServicesEditor.tsx`
Service list (drag-reorder + mobile arrows; `sort_order` fire-and-forget PATCH per change). Two collapsible panels: **Categories** (≤8) and **Add-ons** (≤20). Packages = ⚪ teaser.
- **Service form** (inline, create + edit): Image; Name* (required); Description; Duration (default 30); Price (default 0); Category; Active; **Advanced**: custom gaps before/after, available days (7 chips), assigned staff (multi-chip), linked add-ons (+ Required/Optional toggle).
- **Category modal:** Image, Name*, Description, Active. **Add-on modal:** Image, Name*, Description, Extra price, Extra time, Active.
- States: loading/error; ⚠️ no zero-services empty state. Deletes via `confirm()`.

## §6.3 Appointments — `AppointmentsEditor.tsx` (1,732 lines)
**The operational core.** Mutates bookings + triggers real Stripe money.
- **Filters (6):** Today / This Week / This Month / Pending / Upcoming / All. Stats strip (Today/Pending/This Week/Completed) doubles as filter switcher (⚠️ "None" while loading). Pending callout banner. Customer-filter banner (`?customer_id`).
- **Views:** card list (today/pending/upcoming/all), **WeekGridView** (7-col desktop / stacked mobile), **MonthCalendarView** (grid desktop / grouped mobile). Date-nav toolbar (prev/next/today/date-picker).
- **Inline form (create/edit):** customer_name* / email / phone / service* / add-ons (conditional, required auto-checked) / staff (conditional) / date* / start_time* / status (edit-only) / notes. Live total; service-change side effects.
- **AppointmentCard:** header (name, StatusBadge, PaymentPill) + service/time grid + notes + **booking-form answers** + dispute banner + action row: Confirm / Complete / No-show / Mark paid / Charge balance / Request tip / No-show fee / Late-cancel fee / Refund / Cancel (all conditional).
- **Payment dialogs (3)** — see §16. (⚠️ These live here, not in the Payments hub.)
- ⚠️ Two status-styling maps in one file (`STATUS_CFG` + `apptStatusChipCls`).

## §6.4 Staff — `StaffEditor.tsx`
Card list (Active / Inactive groups; `sort_order`). Placeholder-email banner. **Staff form** (inline): Photo / Name* / Role / Bio / Email* / Phone / Active / Sort order. Per-card expandable **Schedule**: **StaffHoursPanel** (per-day open + open/close + break; own mini-save-bar) + **StaffBlockedDatesPanel** (from/to/reason add + list w/ delete). No modals (all inline/accordion).

## §6.5 Booking Form — `BookingFormEditor.tsx`
Custom question list (type icon, Required chip, type label, scope subline; show/hide eye, edit, delete). ⚠️ No reorder UI despite `sort_order`. **Question modal:** Label* / Type (Short text/Long text/Checkbox/Dropdown/Image) / Options (dropdown only, ≥2) / Help text / Required / Scope (All vs Specific services, ≥1 if specific). `canSave` gate.

## §6.6 Hours (legacy) — ⚠️ DEPRECATED
`/editor/hours` redirects to `/editor/availability`. `HoursEditor.tsx` is orphaned (unreferenced). Off-palette `text-green-600` + "✓" glyph if ever rendered.

---

# §7. Availability hub — `/editor/availability` (Availability 2.0)

**File:** `web/app/(editor)/editor/availability/page.tsx` (tab strip) + 8 panel components. Query-tab inside the page. ⚠️ Tab labels ≠ ids ≠ component names; ⚠️ no hub-level save — each tab self-saves in a *different* style; ⚠️ two visual generations coexist (square `border`+`bg-white` for older tabs vs `rounded-2xl`+`bg-cream` for newer).

| Tab | id | Component | Purpose |
|---|---|---|---|
| Smart Calendar | `calendar` | `CalendarOverridesEditor` | per-date overrides (primary surface) |
| Date Drops | `drops` | `ReleaseStrategyPanel` | when dates open for booking |
| Capacity | `capacity` | `CapacityPanel` | daily caps (shop + per-staff) |
| After Hours | `after-hours` | `AfterHoursPanel` | premium late slots |
| Squeeze-Ins | `squeeze-ins` | `SqueezeInsPanel` | premium "fit me in" on full days |
| Waitlist | `waitlist` | `WaitlistEditor` | cancellation queue |
| Requests | `requests` | `AvailabilityRequestsEditor` | demand-capture inbox |
| Advanced | `advanced` | `AvailabilityEditor` | legacy weekly schedule + limits + blocked dates |

### §7.1 Smart Calendar
Month grid (always 42 cells, Sunday-start). **Cell anatomy:** date number, capacity badge `{count}/{cap}`, status label (hours / "Closed" / "Closed (override)" / "Custom" / "Not released"), notes dot. **Tints:** base (white/gray/red/cream-mauve by override state) + capacity overlay (green<70% / gold 70-99% / red full) + un-released diagonal hatch + today ring + past/outside dimming. 8-swatch legend. Release-state footnote.
- **Override modal** (`OverrideEditorDialog`, click a cell): Availability pills (Available/Closed); Open/Close times (blank=inherit); Break start/end; Max appointments (1–500); Available staff (MultiSelect, null=all); Available services (MultiSelect); Notes (≤200). Footer: Clear override (if exists, `confirm()`) · Cancel · Save. Bottom-sheet on mobile, Esc-close.

### §7.2 Date Drops (panel header ⚠️ "Release strategy")
Mode picker (Always open / Weekly / Bi-weekly / Monthly / Custom). Conditional cadence fields: weekly (day-of-week + time + window days), biweekly (anchor date + time + window), monthly (day-of-month + time + window). Custom → **CustomDropsEditor** (list of {release_date → from–to} + add row, `canAdd` validation, immediate delete). Header Save + "Saved." flash. ⚠️ Mounted without `onChange` so cross-tab refresh relies on remount.

### §7.3 Capacity
Global default (booking_settings.max_appointments_per_day, 1–1000, blank=no limit) + per-staff list (staff.default_daily_capacity, 1–1000). Bottom pill Save + "Saved" 2.5s. Per-staff section only if staff exist.

### §7.4 After Hours
Enable checkbox → config block (dims when off): fee ($, step 0.5), max extension (15–480 min), latest booking time (optional hard cap), daily capacity (optional). Access tier radios: Everyone / Existing customers / VIP customers. Pill Save.

### §7.5 Squeeze-Ins
Config (enable, fee, daily limit 1–100, access tier radios) **+ embedded request queue** (`AvailabilityRequestsEditor kind="squeeze_in"`, see §7.7). Squeeze requests show a `+$fee` chip; approve adds the fee.

### §7.6 Waitlist (`WaitlistEditor`, also at `/editor/waitlist`)
Table: Client (name + mailto + tel) · Service (+ staff) · Window (earliest–latest, prefers, notes) · Status chip (Offer sent/Waiting/…) · Remove (trash, `confirm()` → status=removed). Only owner mutation is Remove; all other transitions are system-driven. Empty/loading/error states.

### §7.7 Requests (`AvailabilityRequestsEditor`)
Request cards (name + status chip + contact + service [+ `+$fee` for squeeze] + "Wants {date} at {time}" + notes + suggested echo). **Inline action panels:** Approve (confirmed time → books), Suggest (date + time + note → emails token link), Decline (note). Status chips: pending=blush, suggested=lavender, decided=gray. No charge until approval (pay-after v1).

### §7.8 Advanced (`AvailabilityEditor`)
Intro card + legacy weekly schedule + 2 link cards (Staff availability, Service availability). Three collapsibles: **Regular Hours** (quick actions "Copy Mon→Weekdays" / "Close Weekend"; 7 DayCards w/ toggle + open/close + break), **Schedule Limits** (gap before/after from [0,5,10,15,20,30,45,60]; max appointments/day), **Blocked Dates** (`BlockedDatesPanel`: from/to/reason add + list + delete). ⚠️ Stale "After hours" coming-soon teaser (now a live tab); ⚠️ dormant legacy `slot_release_*` fields with no UI. Shared `Button` Save + green `CheckCircle2` 3s.

---

# §8. Customers — `/editor/customers`

**File:** `web/components/editor/CustomersEditor.tsx`. Tabs: Overview (⚠️ identical to list — no real overview), Customers (`list`), Loyalty ⚪, Accounts ⚪, Reviews ⚪.

**Purpose / Goal / Frequency / Criticality:** lightweight CRM · "find a client and act" · daily · Important.

### Composition
- Action bar: **Manage Tags**, **Add Customer**.
- **KPI cards (4, clickable filters):** Total / VIP / Balance Due / Inactive (⚠️ "None" while loading).
- **Search** (local-only over loaded list ⚠️ — server `search` param unused; ⚠️ 200-row cap = clients beyond 200 invisible).
- **Filter chips (9, single-select):** All / New / Returning / Regular / VIP / Inactive / Balance Due / Upcoming / No-Show Risk. ⚠️ No tag filter despite tags existing.
- **Customer "table" = card list** (⚠️ not a real table; no columns/sort/bulk-select). Each `CustomerRow`: name, status badge (New/Returning/Regular/VIP gradient/Inactive), balance-due chip, no-show-risk chip, Account chip, ≤3 tag chips (+N), contact line, meta (visits/last/next/spent), chevron. Fixed server sort (`last_booked_at DESC`). Empty/loading/error states.

### Customer detail — right-side **drawer** (`CustomerDrawer`)
Lazy-loads `GET /editor/customers/{id}`. Header (name + status + contact). Quick-action grid (2×2): **Create appt** (`/appointments?new=1&customer_id=`), **View appts** (`?customer_id=`), **Mark/Remove VIP** (toggle), **Add note** (scrolls to notes). Sections: **Tags** (TagsPicker), **Contact** (email/phone/since), **Preferences** (preferred service/staff/time-of-day/contact-method/birthday/notes), **Payment snapshot** (total spent / deposits / outstanding [red] / last payment), **Appointment history** (timeline), **Private notes** (textarea + Save). ⚠️ **No name/email/phone edit after create**; ⚠️ no delete/archive; ⚠️ no message/email action; ⚠️ silent save failures in drawer.

### Forms / Modals
- **Create customer modal:** Full name* / Email (server dedups) / Phone / Notes.
- **Manage Tags modal:** create/rename/recolor/delete tags (6-swatch palette + none). Delete = `confirm()`.
- **Tag picker popover** (in drawer): search + assign/unassign + create-new-then-assign.
- ⚠️ No export (despite a generic `/exports?type=customers` route existing server-side, unwired).

### Status derivation (server, not configurable in UI)
New = 0 completed · Inactive = ≥1 completed but last >90d · Regular = ≥4 within 90d · Returning = 1–3 within 90d · VIP = manual override (`clients.is_vip`).

---

# §9. Payments hub — `/editor/payments` (Stripe Connect; customer payments)

**File:** `web/components/editor/PaymentsHub.tsx`. ⚠️ **Read/monitor only** — all money *actions* (mark paid / refund / charge) live on Appointment cards (§6.3). Tabs: Overview / Deposits / Transactions / Payouts / Settings (⚠️ external link → Settings).

- **Overview:** Stripe-not-connected warning banner; **Open Stripe dashboard** launcher (mints single-use Express URL, new tab); **6 KPI cards** (Total collected, Remaining balance, Deposits paid, Deposits pending [warn], Failed payments [danger], Customer payments enabled/disabled); Recent activity (≤8); footer CTAs.
- **Deposits:** filter chips (all/pending/paid/failed/none + counts); appointment rows w/ PaymentPill; no search/date-range.
- **Transactions:** debounced search (receipt#/customer/service); filter chips (all/deposits/paid/refunded/disputed/failed; initial from `?filter=`, ⚠️ clicks don't write URL); server-refetched; `TransactionRow` (receipt#, name, TxStatusPill, method badge, service/date, amount + tip/refund/due suffixes).
- **Payouts:** ≤25 from Stripe; `PayoutRow` (amount, status pill, method, started/arrives, failure msg); reason-driven empty state (connect status aware); static rows (no actions).
- **Tables:** all are list/divider layouts — no headers/sort/bulk/row-menus. **`AppointmentPaymentStatus.tsx`:** `PaymentPill` (pending/deposit/paid/failed/refunded; active dispute → loud red "Disputed") + `PaymentSummary` one-liner. ⚠️ Three divergent status→label maps (PaymentPill vs TxStatusPill vs PayoutRow).

---

# §10. Billing hub — `/editor/billing` (Stripe Cashier; SaaS subscription)

**File:** `web/components/editor/BillingHub.tsx`. ⚠️ Not in nav; renders own `<h1>` (EditorShell `pageHeader={false}`).

- **Current subscription:** 4 Stat tiles when subscribed (Plan / Billing cycle / Texts/mo / Status); trial card; no-sub card. **Open billing portal** button (→ Stripe Customer Portal for card/invoices/cancel — app renders none of these itself).
- **Plan picker:** cycle toggle (Monthly / Annual "2 mos free"); text-pack toggle (1×/2×/3×); 3 plan cards (Solo/Studio/Salon) with computed proration; **Salon = waitlist-only** (blocked w/ message). CTA → `POST /billing/checkout` → Stripe Checkout → `/checkout/success`.

---

# §11. Settings hub — `/editor/settings`

**File:** `web/components/editor/SettingsHub.tsx` (3,011 lines). 8 live panels (⚠️ `editorNav` lists 9 incl. `integrations` which **redirects out**; Overview grid shows only 7). ⚠️ SaveBar duplicated 4× (extracted for Business/Preferences; hand-inlined for Payments/Booking/Notifications); Account uses per-section saves.

- **Overview** — card grid (7 destinations).
- **Business** — Identity (name, tagline, business_type [+custom], ), Public contact (email, phone, instagram), Address (line/city/state/zip). Public-URL preview. SaveBar.
- **Preferences** — Time & format (timezone [+other], week start, 12/24h), Defaults (default appt duration), Communication (post-booking message, email signature), **Site visibility** (public/private/coming_soon + password [hashed; "Clear password"]). ⚠️ Making site public is **blocked with 422 if email unverified**.
- **Booking** ⚠️ **dual-write** (booking_settings + business_policies): Booking enabled; Auto-confirm; Prevent duplicate bookings; Booking window (min notice, max days ahead, slot interval→`booking_interval_minutes`, release mode→`slot_release_enabled`+`frequency`, window days); Cancellation/reschedule windows; **Enforcement** (require policy agreement, forfeit deposit, max reschedules [0=∞], late grace). ⚠️ Hides `custom` release mode + cadence fields the API supports.
- **Payments** — **Stripe Connect state machine** card (not_connected→onboarding_started→pending→active / restricted; Set up / Continue / Refresh; auto-sync on `?stripe_connect=return`); master `payments_enabled` toggle; Deposit (type %/flat + amount); Allow full payment / BNPL / collect tax / save cards (→ unlocks late fees: no-show fee, late-cancel fee, window); currency (read-only). ⚠️ Same surface reachable via Payments hub Settings tab.
- **Notifications** — Booking-email toggles (owner new-booking, client request, confirmed, cancelled); Reminders (toggle + hours-before); **Per-template overrides** (5 templates: booking_request_client, appointment_confirmed, appointment_cancelled, appointment_rescheduled, appointment_reminder → each subject/intro/signoff); Sender (read-only from-address, reply_to_email, sender_name); **Test-send** per template (⚠️ uses *saved* not draft customizations).
- **Account** (central DB) — Profile (name, email → re-verify + notify both addresses); Change password (current/new/confirm → revokes other sessions); Sign out everywhere (`confirm()`). Per-section saves (⚠️ no SaveBar).
- **Danger** — Pause-bookings mirror (read-only, deep-links to Booking); CSV export (Appointments / Customers — immediate, no confirm); **Delete account** modal (type exact slug + password → cancels Cashier sub → drops tenant DB → revokes tokens → `/login?deleted=1`).

---

# §12. Integrations & Onboarding

## §12.1 Integrations — `/editor/integrations` (`IntegrationsHub.tsx`)
Catalog of tiles across 5 categories. **Only Stripe is live** (dynamic status from `getEditorPaymentSettings`; action deep-links to `/editor/payments`). Coming-soon ⚪: Square; Google Calendar, Calendar feed (.ics), Import busy calendar; BookReady Marketing, Mailchimp, Klaviyo; Outbound webhooks, Zapier; Google Business Profile. Status badges (connected/not_connected/action_required/coming_soon). No forms/modals. ⚠️ Also reachable as a Settings sub-tab (which redirects here).

## §12.2 Onboarding wizard — `/editor/onboard` (`OnboardingWizard.tsx`, ~1,085 lines)
Full-screen, **NOT** in EditorShell. Three scenes: **Welcome** → **Forms (5 steps)** → **Finale**. Redirect guard bounces already-onboarded tenants to `/editor`.
- **Step 1 Business:** name, tagline, email, phone, city, state (⚠️ no required-field enforcement). → `updateEditorBusiness`.
- **Step 2 Services:** editable rows (name, price, mins, remove) + add; reconciles create/update/delete. Empty rows skipped.
- **Step 3 Hours:** 7 day rows (open toggle + open/close times). → `updateEditorHours`.
- **Step 4 Policies:** 4 textareas (cancellation, no-show, late, deposit). → `updateEditorPolicies`.
- **Step 5 Stripe:** Connect (→ completes onboarding then Stripe Express) or Skip. Saver is no-op.
- Footer: Back / "I'll do this later" (skip-all → `/editor`) / Continue. Completion stamps `onboarding_completed_at`. **Finale:** confetti + copy/visit live link + "what's next" deep-links + Go to dashboard.

## §12.3 ComingSoonPanel pattern (`ComingSoonPanel.tsx`)
`ComingSoonPanel` (full-page hero + feature grid w/ "Soon" badges) and `ComingSoonCard` (inline tile). Used in: Customers (loyalty/accounts/reviews), Website (announcements/introduction), Availability (group appts/after-hours⚠️stale/recurring), Services (packages). ⚠️ Four different "coming soon" visual languages: this component, the nav "Soon" pill, the Integrations grey badge, and the bespoke `SeoComingSoonPanel`.

---

# §13. Deliverable 1 — Full Application Sitemap

```
app.bkrdy.me
├── /login, /register, /register/complete, /verify-email, /forgot-password, /reset-password   (auth, pre-shell)
├── /editor                              Dashboard
├── /editor/onboard                      Onboarding wizard (full-screen)
├── /editor/website     ?tab=overview|header|introduction⚪|content|gallery|policies|additionals|announcements⚪|footer|seo⚪
│     ├── /editor/business  → redirect ⚠️ (lands on Website Overview)
│     ├── /editor/policies  → redirect → website?tab=policies
│     └── /editor/gallery   → redirect → website?tab=gallery
├── /editor/bookings                     Bookings Overview
│     ├── /editor/services
│     ├── /editor/appointments           ?filter=… ?focus=… ?customer_id=… ?new=1 ?status=pending ?date=…
│     ├── /editor/availability  ?tab=calendar|drops|capacity|after-hours|squeeze-ins|waitlist|requests|advanced
│     ├── /editor/staff
│     ├── /editor/booking-form
│     ├── /editor/waitlist
│     └── /editor/hours      → redirect → /editor/availability ⚠️
├── /editor/customers   ?tab=overview⚠️|list|loyalty⚪|accounts⚪|reviews⚪
├── /editor/payments    ?tab=overview|deposits|transactions|payouts|settings(→Settings)
├── /editor/integrations
├── /editor/settings    ?tab=overview|business|preferences|booking|payments|notifications|account|integrations(→Integrations)|danger
└── /editor/billing                      ⚠️ not in sidebar
External link-outs: {slug}.bkrdy.me (public site), Stripe Express dashboard, Stripe Customer Portal, /help, /admin
```

# §14. Deliverable 2 — Full Navigation Tree
See **§3** (the complete `Nav → Section → Tab → Component → Action` tree with live/soon markers). Key facts: 7 sidebar items + 2 hidden (Billing, Onboard); 3 nav modes (sidebar hardcoded, query-tab, route); 9 query-tab sections; the sidebar does **not** consume `editorNav.ts`.

# §15. Deliverable 3 — Full Screen Inventory

| # | Screen / Tab | Route | Component | State |
|---|---|---|---|---|
| 1 | Dashboard | `/editor` | `page.tsx` DashboardBody | 🟢 |
| 2 | Onboarding (5 steps) | `/editor/onboard` | OnboardingWizard | 🟢 |
| 3–12 | Website × 10 tabs | `/editor/website?tab=` | WebsiteHub | 🟢×7, ⚪×3 |
| 13 | Bookings Overview | `/editor/bookings` | AppointmentsDashboard | 🟢 |
| 14 | Services | `/editor/services` | ServicesEditor | 🟢 |
| 15 | Appointments | `/editor/appointments` | AppointmentsEditor | 🟢 |
| 16 | Staff | `/editor/staff` | StaffEditor | 🟢 |
| 17 | Booking Form | `/editor/booking-form` | BookingFormEditor | 🟢 |
| 18 | Waitlist (standalone) | `/editor/waitlist` | WaitlistEditor | 🟢 |
| 19–26 | Availability × 8 tabs | `/editor/availability?tab=` | 8 panels | 🟢×8 |
| 27–31 | Customers × 5 tabs | `/editor/customers?tab=` | CustomersEditor | 🟢×2(dup), ⚪×3 |
| 32–36 | Payments × 5 tabs | `/editor/payments?tab=` | PaymentsHub | 🟢×4, ↪×1 |
| 37 | Integrations | `/editor/integrations` | IntegrationsHub | 🟢 catalog |
| 38–46 | Settings × 9 tabs | `/editor/settings?tab=` | SettingsHub | 🟢×8, ↪×1 |
| 47 | Billing | `/editor/billing` | BillingHub | 🟢 |
| — | Hours (legacy) | `/editor/hours` | redirect | ⚠️ orphaned |

**~46 distinct tenant screens** (excluding redirects). Loading/empty/error states exist per screen but are inconsistent (see §20).

# §16. Deliverable 4 — Full Component Inventory

**Shell:** EditorGuard, AppShell, AppSidebar, EmailVerifyBanner, EditorShell, SectionTopBar, EditorInnerNav, EditorPageHeader, EditorProvider/editorContext, WelcomeTour.
**Shared atoms:** SaveBar (⚠️×4 copies), useSettingsForm, ImageUploadField, ComingSoonPanel/ComingSoonCard/SoonBadge, AppointmentPaymentStatus (PaymentPill + PaymentSummary), shared UI Button/Input/Textarea (partial adoption).
**Dashboard widgets (page.tsx-local):** SectionHeader, StatusPill, EmptyTile, NextApptHero, SummaryStatCard, RevenueChart (+AreaChart, ChartTooltip, ChartDetailPanel, PeriodToggle), BookingSnapshotCard, UpcomingCard, WeekStrip (+DensityDots), MoneySnapshot, HealthMetricCard, NewCustomersCard, TopSpendersCard, GrowthOpportunitiesCard, AnnouncementsBlock, SetupChecklist, QuickActions.
**Bookings:** AppointmentsDashboard (HubCard, PreviewCard), ServicesEditor (ServiceRow, AddServiceForm, CategoriesPanel/CategoryRow/CategoryDialog, AddonsPanel/AddonRow/AddonDialog, AdvancedSection, ComingSoonCard), AppointmentsEditor (AppointmentCard, WeekGridView, MonthCalendarView, ActionBtn, StatusBadge), StaffEditor (StaffCard, StaffHoursPanel, StaffBlockedDatesPanel), BookingFormEditor (QuestionRow, QuestionDialog, DropdownOptionsEditor), HoursEditor⚠️.
**Availability:** CalendarOverridesEditor (CalendarCell, OverrideEditorDialog, MultiSelect, PillToggle, TimeField), ReleaseStrategyPanel (ModePill, CustomDropsEditor, DaysField, Field), CapacityPanel, AfterHoursPanel, SqueezeInsPanel, WaitlistEditor (StatusBadge), AvailabilityRequestsEditor (StatusChip), AvailabilityEditor (CollapsibleSection, DayCard, Toggle, TimeInput, SelectInput, BlockedDatesPanel, ComingSoonCard).
**Customers:** CustomersEditor (CustomerRow, StatusBadge, CustomerDrawer/DrawerContent/DrawerAction/DrawerSection/SnapshotCell/TimelineRow/ContactRow, CreateCustomerDialog, ManageTagsModal, TagsPicker, TagChip, ColorPalettePicker, PreferencesForm).
**Payments/Billing:** PaymentsHub (StatCard, ActivityRow, TransactionRow/TxStatusPill, PayoutRow, CardLink, StripeDashboardButton, LoadingRow/ErrorRow), MarkPaidDialog, RefundDialog, ChargeBalanceDialog, BillingHub (Stat, CycleBtn, plan cards).
**Settings:** SettingsHub (Toggle, NumberField, SelectField, TextField, TextAreaField, MoneyInput, FieldLabel, SectionTitle, SaveBar, 8 panels, StripeConnectBlock, EmailContentEditor, EmailTemplateCard, ExportCard, DeleteAccountDialog).
**Integrations:** IntegrationsHub (CategorySection, Tile, StatusBadge, ActionButton).
⚠️ **Legacy/dead:** GalleryEditor, PoliciesEditor, BusinessForm, LivePreview, HoursEditor.

# §17. Deliverable 5 — Full Workflow Inventory

| Workflow | Steps (happy path) | Success | Failure |
|---|---|---|---|
| **New booking (owner)** | Appointments → New → name*+service*+date*+time* (+addons/staff) → Create | row added, optimistic re-sort | "Fill required fields" / "Failed to save" |
| **Reschedule** | open card → change date/time → Save Changes | updated in place | inline error |
| **Cancel / Decline** | card → Cancel/`confirm()` (or Overview Decline → delete) | soft-cancel (status=cancelled) | — |
| **Confirm request** | pending card → Confirm | status=confirmed | — |
| **Mark paid (manual)** | card → Mark paid → amount+method+note → Record | row updates; not Stripe-refundable | "Could not record" |
| **Refund** | card → Refund → full/partial (+reason if Stripe) → Confirm | refund issued + email (Stripe) | "Refund failed" |
| **Charge balance** | card → Charge balance → Send → copy link | Stripe Checkout link emailed (24h) | "Could not send" |
| **New client** | Customers → Add Customer → name* (+email/phone/notes) | prepended (email dedup) | "already exists" |
| **Tag / VIP a client** | drawer → Tags picker / Mark VIP | partial PATCH | ⚠️ silent |
| **Service creation** | Services → Add Service → name* (+price/dur/category/advanced) → Add | row appended | "Name is required" |
| **Booking question** | Booking Form → Add → label*+type(+options/scope) → Add | list refresh | canSave gate |
| **Availability override** | Calendar → click date → set/close → Save override | cell repaints | inline error |
| **Date drops** | Availability→Drops → mode + cadence → Save | calendar hatches un-released | "Saved." / error |
| **Capacity cap** | Availability→Capacity → numbers → Save capacity | badges/tints honor cap | inline error |
| **Enable after-hours / squeeze-ins** | tab → enable + config + tier → Save | premium slots/requests appear | inline error |
| **Approve availability/squeeze request** | Requests → Approve → confirmed time → Confirm | appointment created (+fee) | alert |
| **Waitlist remove** | Waitlist → trash → `confirm()` | status=removed | alert |
| **Edit website section** | Website tab → edit → Save | live + preview re-keys | SaveBar error |
| **Change template** | Website→Overview → pick → confirm → reload | reseeded settings | "already active" |
| **Add gallery image** | Gallery → Add image → upload → Add | thumbnail (⚠️ preview needs manual refresh) | "Image required" |
| **Edit policies** | Website→Policies (or Settings→Booking enforcement) → Save | shared business_policies | error |
| **Booking rules** | Settings→Booking → edit → Save | dual-write settings+policies | error |
| **Customize notification template** | Settings→Notifications → edit → (test-send) → Save | email_templates persisted | ⚠️ test uses saved not draft |
| **Connect Stripe (Connect)** | Settings→Payments (or Integrations→Stripe, or Onboarding) → Set up → return → auto-sync | status→active | restricted → Continue |
| **Change subscription (Cashier)** | Billing → cycle+pack+plan → Switch → Stripe Checkout | webhook stamps sub | Salon blocked (waitlist) |
| **Change password** | Settings→Account → current+new+confirm → Update | other sessions revoked | per-section error |
| **Change email** | Settings→Account → email → Save | re-verify + notify both addresses | unique error |
| **Export data** | Settings→Danger → CSV card | file downloads (no confirm) | inline error |
| **Delete account** | Settings→Danger → modal → exact slug + password → Delete forever | cancels sub, drops tenant → `/login?deleted=1` | 422 bad slug/pw |
| **Complete onboarding** | Welcome → 5 steps → Stripe/skip → Finale | `onboarding_completed_at` set | inline error per step |
| **Sign out everywhere** | Settings→Account → `confirm()` | N sessions revoked | error |

# §18. Deliverable 6 — Full Form Inventory

| Form | Location | Required | Save | Notes |
|---|---|---|---|---|
| Business profile | Settings→Business / Website link | name, email (legacy form) | SaveBar | shares business_profiles w/ Preferences |
| Preferences | Settings→Preferences | — | SaveBar | site password hashed; publish gated on verify |
| Booking settings | Settings→Booking | — | SaveBar (dual-write) | maps slot_interval→booking_interval_minutes |
| Payment settings | Settings→Payments | — | inline SaveBar | + Connect actions (separate) |
| Notifications | Settings→Notifications | — | inline SaveBar | per-template subject/intro/signoff |
| Account profile / password | Settings→Account | password fields | per-section | central DB |
| Service create/edit | Services | name | explicit btn | + advanced (gaps/days/staff/addons) |
| Category / Add-on | Services modals | name | modal btn | caps 8 / 20 |
| Appointment create/edit | Appointments | name, service, date, time | explicit btn | conditional addons/staff |
| Staff create/edit | Staff | name, email | explicit btn | + schedule sub-panels |
| Staff hours | Staff card | — | mini save-bar | per-day |
| Staff blocked date | Staff card | from | add btn | — |
| Booking question | Booking Form modal | label (+≥2 opts / ≥1 service) | modal btn | canSave gate |
| Override editor | Availability calendar modal | — (avail/closed) | modal btn | times/cap/staff/services/notes |
| Release strategy | Availability→Drops | mode-dependent | header btn | custom drops sub-form |
| Capacity | Availability→Capacity | — | pill btn | global + per-staff |
| After-hours / Squeeze config | Availability tabs | — | pill btn | fee/extension/tier/limit |
| Weekly hours / limits / blocked | Availability→Advanced | from (blocked) | shared Button | legacy |
| Create customer | Customers modal | name | modal btn | email dedup |
| Customer notes / preferences / tags | Customers drawer | — | per-section | ⚠️ no name/email/phone edit |
| Tag create/rename | Manage Tags modal | name | inline | uniqueness enforced |
| Website panels (header/content/about/extras/footer) | Website tabs | — | SaveBar | per-panel; validation only on Instructions |
| Policies | Website→Policies | — | SaveBar | 6 named + custom |
| Gallery / Before-After item | Website modals | image(s) | modal btn | — |
| Plan checkout | Billing | plan/cycle/pack | CTA | Salon blocked |
| Delete account | Settings→Danger modal | slug + password | modal btn | irreversible |
| Onboarding steps 1–4 | Onboarding | ⚠️ none enforced | Continue | existing editor APIs |

# §19. Deliverable 7 — Full Modal / Drawer Inventory

**Modals (centered/bottom-sheet overlays):** WelcomeTour; GalleryGroupDialog, GalleryItemDialog, ResultsItemDialog (Website); CategoryDialog, AddonDialog (Services); QuestionDialog (Booking Form); OverrideEditorDialog (Availability); CreateCustomerDialog, ManageTagsModal (Customers); MarkPaidDialog, RefundDialog, ChargeBalanceDialog (Appointments); DeleteAccountDialog (Settings→Danger); AnnouncementDialog (admin-only). **Popover:** TagsPicker (Customers drawer). **Drawer:** CustomerDrawer (right slide-in). **Inline accordion "drawers":** Staff Schedule panel; Availability Requests action panels. **Native `confirm()`** (⚠️ not styled modals): delete service/category/addon/question/gallery/blocked-date/waitlist/tag, cancel appointment, clear site password, sign-out-everywhere, request tip, late fees. **Native `alert()`:** waitlist + requests action errors.

# §20. Deliverable 8 — Full Data-Input Inventory (by type)

- **Text inputs:** business name/tagline/type/custom-type, address (line/city/state/zip), public email/phone, instagram, service name/description, category/addon name/description, staff name/role/email/phone, customer name/email/phone, tag name, appointment customer fields/notes, question label/help/options, website headings/labels/announcement/button URLs/about/highlights/FAQ/reviews/footer, policy textareas, email-template subject/intro/signoff, sender name, reply-to, notes/preferences, blocked-date reason, override notes, onboarding fields, delete-confirm slug.
- **Number inputs:** price, duration, buffers, sort_order, capacities (default + per-staff + per-date), max days ahead, min notice, slot interval, release window days, cancellation/reschedule windows, after-hours fee/extension/cap, squeeze fee/limit, late fees/window, default appt duration, max reschedules, late grace, reminder hours, deposit amount.
- **Date/time inputs:** appointment date + start_time, override open/close/break, weekly hours times, blocked-date from/to, release dates (drop/anchor), latest booking time, birthday, reminder schedules.
- **Selects/dropdowns:** business type, timezone, week start, time format, category, staff, service, question type, release mode, deposit type, payment method, refund reason, plan/cycle/pack, slot interval, day-of-week/month.
- **Toggles/checkboxes:** ~40+ (section visibility, header buttons, booking flags, payment flags, notification toggles, service active/days, question required, footer flags, after-hours/squeeze enable, day open).
- **Radios:** access tiers (after-hours, squeeze), availability available/closed (pills), refund full/partial, request scope.
- **Pickers:** color palette (tags), theme swatches/patterns, image upload (file/drag/URL), multi-select chips (staff/services/addons/available-days).

# §21. Deliverable 9 — UX Consistency Report

### A. Duplicate / overlapping functionality
1. **SaveBar implemented 4×** (`useSettingsForm` only in WebsiteHub; hand-inlined in 3 Settings panels) → consolidate into one shared module.
2. **StatusPill / payment-status maps duplicated 4–5×** with divergent palettes (Dashboard vs Bookings-overview vs AppointmentsEditor `STATUS_CFG`+`apptStatusChipCls` vs PaymentPill vs TxStatusPill vs PayoutRow) → single tokenized status registry.
3. **Two weekly-hours editors** (legacy `HoursEditor` orphaned vs `AvailabilityEditor` DayCard vs `StaffHoursPanel`) — 3 schedule UIs.
4. **Payments money-actions split from Payments hub** (live on Appointments) → the hub named "Payments" can't take payment actions.
5. **Stripe surfaces appear in 3 places** (Settings→Payments, Payments hub Settings tab, Integrations→Stripe) all deep-linking to one config.
6. **Policies edited in two places** (Website→Policies copy + Settings→Booking enforcement, same `business_policies`).
7. **Business profile split** across Settings→Business + Settings→Preferences (same model/endpoint).
8. **Waitlist appears twice** (standalone `/editor/waitlist` + Availability tab) — intentional shared component but two nav entries.
9. **Customers Overview = Customers list** (phantom duplicate tab).
10. **Legacy dead components** (GalleryEditor, PoliciesEditor, BusinessForm, LivePreview, HoursEditor) still in tree.

### B. Inconsistent terminology
- Nav label ≠ key ≠ component: "Top Banner"=header=Hero; "Extras"=additionals; "Get Found on Google"=seo; "Smart Calendar"=calendar=CalendarOverridesEditor; "Date Drops"=drops="Release strategy".
- "Before & After"=results=before_after=`Results tab` (4 names).
- "Decline" vs "Cancel" (same soft-cancel); "Remove" vs "Delete".
- Two different "Announcements" (platform feed vs Website coming-soon).
- Status label drift: "Deposit paid" vs "Deposit"; "Partially refunded" vs "Part refund".

### C. Inconsistent layouts / patterns
- Create/edit is a **modal** for Categories/Add-ons/Questions/Customers but **inline panel** for Services/Appointments/Staff — no rule.
- Save UX: hub SaveBar vs per-section saves (Account) vs header-button (Drops) vs pill (Capacity/After-hours) vs immediate-on-toggle (Booking-form visibility, Staff active) vs modal buttons. **No global save grammar.**
- Reorder: drag+arrows (Services) vs numeric field (Staff) vs none (Booking Form, despite sort_order).
- Loading states: "Loading…" vs "Loading your dashboard…" vs literal "None" (stats strips) vs spinners vs skeleton-less.
- Empty states: polished rounded cards (Requests/Waitlist) vs bare italic lines (blocked dates) vs missing (zero services).
- Confirmation: styled modal (delete account) vs native `confirm()`/`alert()` everywhere else.
- Two visual generations in Availability (square+white vs rounded+cream).
- Greens/reds not tokenized (`#0f6f3d`/`#1e7a3f`/`text-green-700`; `#b42828`/`bg-red-50`).
- Off-palette stragglers: HoursEditor `text-green-600` + "✓" glyph.

### D. Inconsistent navigation
- Sidebar hardcodes nav (incl. Integrations as top-level) while `editorNav.ts` treats Integrations as a Settings sub-tab → `/editor/integrations` shows "SETTINGS" eyebrow but Integrations sidebar-active.
- Billing + Onboarding have no nav entry.
- `editorNav` lists 9 Settings tabs but 1 redirects out + Overview shows 7.
- ⚠️ Bug: `/editor/business` redirect lands on Website Overview (invalid tab).
- WelcomeTour references non-existent "Settings → Domain" and "Billing tab".

### E. Functional gaps (rebuild-critical)
- No customer name/email/phone edit after create; no customer delete/archive; no customer export UI; no tag filter; local-only search w/ 200-row cap; silent drawer save failures.
- No toast system (all feedback inline).
- No discard/reset on any form.
- Booking Form has no reorder.
- Inconsistent preview auto-refresh in Website (settings yes, items no).

# §22. Deliverable 10 — Simplification Roadmap

For each opportunity: **action** (Remove / Merge / Hide / Automate / Simplify) + rationale.

### Remove (dead weight)
- **Delete** `HoursEditor.tsx` + `/editor/hours` route; `GalleryEditor`, `PoliciesEditor`, `BusinessForm`, `LivePreview` (all dead). Rationale: unreferenced; confuses rebuild.
- **Remove** the phantom Customers **Overview** tab (or build a real one) — today it duplicates the list.
- **Remove** `_futureIcons` dead import (Integrations) and the dormant `slot_release_*` fields in `AvailabilityEditor`.

### Merge (reduce surface)
- **Consolidate SaveBar + useSettingsForm** into one shared module; adopt everywhere → kills 4-way drift.
- **Single status/payment-badge registry** (tokenized colors + labels) consumed by all 5 renderers.
- **Merge Settings→Business + Settings→Preferences** into one "Business" surface (same model) with sub-sections.
- **Unify the 3 schedule editors** onto one weekly-hours component (business + per-staff).
- **Fold Integrations→Stripe and Payments-hub Settings** into a single canonical "Payments setup" page; have the others link, not re-render.
- **Decide Waitlist's home** (Availability tab *or* Bookings page, not both nav entries).

### Hide (declutter until built)
- **Hide coming-soon tabs/cards** behind a single feature-flag + one consistent "Coming soon" treatment (retire the 4 variants). Candidates: Website Introduction/Announcements/SEO; Customers Loyalty/Accounts/Reviews; Services Packages; Availability group/recurring teasers.
- **Hide Billing-tour copy** until Billing has a nav entry (or add the entry).

### Automate
- **Auto-save** (debounced) on the low-risk settings panels to remove the manual SaveBar friction; keep explicit save only for money/destructive forms.
- **Auto-refresh preview** on *all* Website saves (gallery/policy items currently require a manual refresh).
- **Replace inline "None"-while-loading** with a shared skeleton; auto-derive empty/loading/error from one `<AsyncState>` wrapper.

### Simplify
- **Introduce a toast system** for transient success/error; reserve inline banners for blocking states. Removes silent failures (Copy Link, drawer saves).
- **Add a global confirmation dialog** to replace native `confirm()`/`alert()`.
- **One create/edit convention** (pick modal *or* inline per entity size) — e.g. modal for short objects (category/add-on/question/customer), inline for long ones (service/appointment/staff).
- **Fix the `/editor/business` redirect** target; align the sidebar with `editorNav.ts` (single nav source) so section eyebrow always matches the active item; give Billing + Onboarding proper nav treatment.
- **Customers CRM gaps:** add name/email/phone edit, archive/merge, tag filtering, server-side search/pagination, export button (wire the existing `/exports` route), and surface drawer save errors.
- **Standardize reorder** (drag handle + arrows) across Services/Staff/Booking Form/Website sections.

---

*End of Architecture Bible. Source-of-truth files cited inline throughout; nav config = `web/lib/editorNav.ts`; shell = `web/components/editor/EditorShell.tsx`; the eight area inventories this synthesizes were generated from a full read of every `/editor` page + component + the relevant `api/` controllers.*
