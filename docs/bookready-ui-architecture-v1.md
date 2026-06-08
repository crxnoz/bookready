# BookReady UI Architecture v1

> A platform-wide UI **architecture system** — not a redesign, not a visual style guide. It defines the structural rules every current and future screen must follow so the product stays consistent, learnable, and scalable as it grows from a single-chair solo pro to a multi-location team platform.
>
> **Companion doc:** `docs/tenant-architecture-bible.md` (the as-built inventory + 66 flagged issues). This document is the *target state* those issues resolve into.
>
> **Out of scope (by instruction):** color, typography, spacing, visual styling. Everything here is architecture, hierarchy, UX consistency, scalability, maintainability.
>
> **The established design language is a given** (sharp, structured, premium, minimal radius, cream bg, white cards, thin borders, editorial, no gradients/glass/pill-soup). Architecture decisions below assume and protect it but never re-specify it.

---

## 0. The Constitution — 10 Global Laws

Every rule in this document descends from these. When a future decision is ambiguous, resolve it toward these laws.

1. **One source of truth for navigation.** The nav config (`editorNav.ts`) defines sections, sub-tabs, labels, icons, order, and visibility. The sidebar, the section eyebrow, the inner-nav strip, breadcrumbs, and the mobile nav all *derive* from it. Nothing hardcodes nav. *(Today the sidebar hardcodes its own list — that is banned.)*

2. **The URL is the state.** Which section and sub-tab you're on lives in the **path** (`/section/subtab`). Query strings are reserved for *view state within a screen* (`?status=pending`, `?focus=id`, `?range=month`). A tab is never a query param. *(Today `?tab=` selects tabs in 4 hubs — that is migrated.)*

3. **One capability, one home.** Every capability has exactly one screen that owns it. Every other surface *links* to that owner — it never re-implements it. *(Today Stripe setup lives in 3 places; payment actions live in a screen called something else — banned.)*

4. **One component per job.** There is one SaveBar, one ConfirmDialog, one StatusBadge registry, one EmptyState, one Drawer, one DataList, one Toast. Duplication is a defect, not a style choice. *(Today: 4 SaveBars, 5 status maps, native `confirm()`/`alert()`, zero toasts.)*

5. **Feedback is systematic.** Transient outcomes → toast. Blocking/contextual states → inline banner. Pending → skeleton. Empty → EmptyState. Never silent (Copy Link today is silent), never a browser `alert()`.

6. **Save is predictable.** A screen is either *explicit-save* (one SaveBar governs the whole screen) or *instant-save* (each control commits on change with inline feedback). Never both on one screen, and never ambiguous which it is. Destructive and money actions are always explicit + confirmed.

7. **Read where you browse, act where you own.** Overview/monitoring screens link out to the owning screen to perform mutations; they don't grow their own action surfaces. The exception is *triage* (confirm/decline/quick-status) which is allowed inline because speed is the point.

8. **Progressive disclosure by tier.** Solo pros see a minimal surface; complexity (locations, teams, advanced availability) appears only when enabled. The architecture has slots for advanced features that stay invisible until switched on. Nothing that a 1-chair barber doesn't need is in their default path.

9. **Everything scopes to a context.** Today the implicit context is "the business." Tomorrow it's "the business + the selected location." Every list, metric, and setting must be expressible as *scoped to the current context*, so multi-location is an additive context switch, not a rewrite.

10. **Coming-soon is a first-class, uniform state.** Unbuilt features use one mechanism (one component + one feature-flag system), are clearly labeled, and never masquerade as broken live features. *(Today: 4 different coming-soon treatments.)*

---

# 1. Navigation Architecture

## 1.1 The three navigation tiers (and a hidden fourth)

```
TIER 0  Context Switcher   — account / location  (top of sidebar; hidden for single-location)
TIER 1  Primary Nav        — grouped sections     (sidebar groups)
TIER 2  Section Nav        — sub-tabs of a section (route-based strip under the page header)
TIER 3  View State         — filters/focus/range  (query params, never nav)
```

This is the spine of the whole system. Today there are only Tiers 1–3 and Tier 1 is a flat 7-item list with no grouping — which does not survive the addition of Marketing, Loyalty, Memberships, Reviews, AI, Marketplace. Tier 0 does not exist and must be reserved now even though it renders nothing for current tenants.

## 1.2 Primary Nav — grouped, not flat

**Rule:** Primary nav is organized into **named groups**, each holding 2–5 sections. New features join an existing group; we add a group only when a genuinely new domain appears. A flat list is banned beyond ~7 items because it stops being scannable.

**Canonical group model (v1 target):**

| Group | Sections (today) | Reserved for (future) |
|---|---|---|
| **(ungrouped top)** | Dashboard | — |
| **Operate** | Calendar (Appointments), Availability, Services, Team | Resources/rooms, Classes |
| **Clients** | Customers | Marketing, Loyalty, Memberships, Reviews |
| **Storefront** | Website | Marketplace, Online store |
| **Money** | Payments, Billing | Payouts/Reports, Invoices |
| **Manage** | Settings, Integrations | Locations, Roles & permissions |

Notes:
- **Bookings as a section disappears as a label.** "Bookings" today is a hub that mixes a *thing you do daily* (the appointment calendar) with *configuration* (services, staff, availability, booking form). Split it: the daily calendar becomes **Calendar** (top of Operate); the configuration items become their own sections in Operate. This is the single biggest IA correction (§7).
- Single-location, solo tenants see a **collapsed** version (groups can render as plain dividers, not collapsible accordions, to keep it sharp/editorial). Groups exist structurally even when the tenant only has 4 sections.
- Group order encodes frequency: Operate (daily) → Clients → Storefront → Money → Manage (rare).

## 1.3 Section Nav (sub-tabs) — route-based, derived, capped

- **Sub-tabs are routes:** `/customers`, `/customers/segments`, `/customers/tags`. **Not** `?tab=`. Rationale: deep-linkable, code-split per tab, the URL equals the nav tree, and back/forward behaves. *(Migration from `?tab=`: keep query-param aliases as redirects for one release.)*
- **Derived from config:** the sub-tab strip renders from the section's `tabs[]`. Adding a tab = one config entry, never a new bespoke strip.
- **Cap at ~6 visible sub-tabs.** Beyond that, the section is doing too much (see Availability, §7.4, which has 8). Overflow goes into an "Advanced" or "More" tab, or the section splits.
- **Sub-tab ≠ dumping ground.** A sub-tab must be a genuine facet of the same noun. "Squeeze-Ins" and "After Hours" are *availability products*, fine as facets; but a sub-tab that is really a different job (the Waitlist *queue* vs availability *config*) signals a split.

## 1.4 Page hierarchy rules

Every in-shell page has exactly this header stack, all derived from config + route:

```
Context line (Tier 0, only if multi-location)         "Downtown location ▾"
Section eyebrow (Tier 1)                                "CLIENTS"
Page title + optional subtitle (the page)              "Customers"
Section nav strip (Tier 2)                              Overview · Segments · Tags
[Primary action]                                        right-aligned, max ONE primary per page
```

- **One primary action per page**, top-right, verb-first ("New appointment", "Add customer"). Secondary actions are lower-emphasis and live beside it or in the content.
- The section eyebrow must always match the active primary-nav item. *(Today `/editor/integrations` shows "SETTINGS" — a direct violation of Law 1.)*

## 1.5 Breadcrumb / back-link rules

- **Depth 0** (section hub) and **Depth 1** (sub-tab): no back link. The sub-tab strip *is* the wayfinding.
- **Depth 2** (a record detail that is a full page, not a drawer): show a single back link to the parent list (`← Customers`), not a full breadcrumb trail. The platform is shallow; multi-level breadcrumbs are overkill and add chrome.
- **Drawers and modals never get back links** — they have a close affordance and the page behind them is the context.
- **Rule of thumb:** if you need more than one level of back-link, you've built the hierarchy too deep — prefer a drawer over a nested page.

## 1.6 Hidden / utility route rules

There are three legitimate kinds of non-nav route. Each has defined behavior:

1. **Focus-mode routes** (Onboarding wizard): full-screen, **no shell** (no sidebar/eyebrow/sub-nav), own stepper, an explicit exit ("I'll do this later"). Allowed to bypass the shell because the job is single-threaded. Must be reachable only by system redirect, never deep-linked-into without state.
2. **Account/utility routes** (Billing today): these are real destinations and **must be reachable from nav** — either as a section (Money group) or from a persistent account menu. *Orphaned routes are banned* (Billing is currently orphaned; the WelcomeTour even references a "Billing tab" that doesn't exist).
3. **Redirect routes** (legacy `/editor/hours`, `/editor/business`): a redirect must land on a **valid** destination. *(Today `/editor/business` → `?tab=business` which isn't a valid tab → silently dumps the user on Website Overview. Banned: redirects must be tested to resolve.)* Legacy redirects are temporary; remove the source route once analytics show no traffic.

## 1.7 Mobile navigation

- Primary nav groups collapse to a **bottom tab bar** of the top 4–5 groups; the rest live behind a "More" sheet. Because Tier-1 is grouped, this mapping is mechanical and stable as features are added (new features land inside a group, not as a new bottom tab).
- Section sub-tabs become a horizontally-scrollable strip (already the pattern) — keep, but it must come from the same config.
- The context switcher (Tier 0) sits in the mobile header.

---

# 2. Page Structure System

## 2.1 Reject "one universal structure"

The brief proposed: `Header → Stats → Filters → Content → Drawer/Modal`. **That is the correct structure for *one* page type (the List/Management page) but it is wrong as a universal.** Forcing a settings page, a dashboard, or the website editor into "stats row → filters row" would be architecturally false. The platform genuinely has **seven page archetypes**. Consistency comes from (a) a fixed set of archetypes, (b) a shared header stack across all of them (§1.4), and (c) strict rules *within* each archetype — not from one shape.

## 2.2 The seven page archetypes

Every screen is exactly one archetype. New screens must declare which.

### A. Dashboard (Overview)
`Header → Layer stack` (read + triage + navigate only). No filters row, no primary "create" surface beyond shortcuts. Governed by §6.

### B. List / Management page  ← *the brief's structure*
```
Header (+ primary action)
Stat strip            (optional, ≤4 KPIs, each a filter shortcut)
Toolbar              (search + filter chips + view switch + bulk-action bar when rows selected)
Data region          (DataList or DataTable)
Row → Drawer         (record detail opens in a drawer, not a new page)
Create/Edit → Modal or Drawer (per §4 rule)
```
Used by: Customers, Appointments (list views), Services list, Staff list, Payments tabs, Waitlist, Requests.

### C. Record / Detail page
For records too rich for a drawer (rare in this platform). `Header (← back) → summary card → sectioned detail → contextual actions`. **Default to a Drawer instead**; only promote to a full page when the record has its own sub-tabs (e.g. a future Customer profile with Activity/Payments/Notes/Marketing tabs).

### D. Settings / Form page
```
Header
Sectioned form        (grouped fieldsets, each with a SectionTitle)
SaveBar               (sticky; one per screen)  OR instant-save controls (never mixed)
```
Used by: every Settings tab, notification config, payment config, booking rules.

### E. Editor / Builder page (split-view)
```
Header
Two-pane:  [ control column ]  |  [ live preview ]   (preview optional/collapsible on mobile)
SaveBar per panel OR instant-save (declare one)
```
Used by: Website hub. **This is the only archetype allowed a persistent preview pane.** Its save model must be uniform across all panels (today it isn't — some panels auto-bump the preview, some don't).

### F. Wizard / Focus page
```
Full-screen, no shell
Progress stepper
One step at a time
Footer nav: Back · Skip · Continue
Finale state
```
Used by: Onboarding. Reusable for future multi-step flows (location setup, import, plan migration).

### G. Empty / Coming-soon page
One component, feature-flag driven (§3.6). Used by every unbuilt section/tab.

## 2.3 Shared slots across all archetypes

Regardless of archetype, these slots are identical everywhere (this is what makes the platform *feel* like one product):
- **Header stack** (§1.4): eyebrow, title/subtitle, sub-tab strip, one primary action.
- **Async states:** one `<AsyncBoundary>` convention renders skeleton / error / empty so no two screens invent their own "Loading…" string or literal "None" (a real current bug).
- **Action placement:** primary = header top-right; row actions = end of row / drawer; destructive = isolated and confirmed.
- **Feedback:** toast for transient, inline banner for contextual (§5 of Bible / Law 5).

---

# 3. Card System

A **card** is a bordered white container on cream. We define a closed set of card *roles*. A card must be exactly one role; mixing roles (e.g. a stat that's also a nav target that's also a form) is banned.

## 3.1 StatCard
- **Purpose:** a single metric. Label (uppercase eyebrow) + value (tabular) + optional delta/sub + optional one icon.
- **Rules:** value is the hero; at most one secondary line. A StatCard MAY be a filter-shortcut (clicking scopes the list below) — if so it shows a consistent "View"/active affordance. A StatCard is **never** a form or a multi-action surface.
- **Grouping:** stat strips are ≤4 across (mobile 2-up). More than 4 metrics → that's a dashboard layer or a report, not a stat strip.

## 3.2 ManagementCard (a.k.a. NavCard / HubCard)
- **Purpose:** a navigational entry into a sub-area (the Bookings hub cards, Settings overview grid, "what's next" cards).
- **Rules:** icon + title + one-line description + a single forward affordance; the **whole card is the link**. No inline secondary actions. May carry one status badge (e.g. "3 pending"). Has a defined `disabled/soon` variant (§3.6).

## 3.3 RecordCard (list row rendered as a card)
- **Purpose:** one entity in a list (customer, appointment, staff, request).
- **Rules:** the card is the row. Primary identity bold; supporting metadata in a defined order; status via StatusBadge; **whole card opens the detail drawer**; explicit actions (≤2) may sit at the row end, everything else lives in the drawer. Triage actions (Confirm/Decline) are the *only* mutations allowed directly on a RecordCard.

## 3.4 InfoCard
- **Purpose:** static informational/explanatory content, link-outs, "this lives elsewhere" pointers.
- **Rules:** title + body + optional single link. No form fields. Used to cross-link owned capabilities (Law 3) instead of duplicating them.

## 3.5 AlertCard / Banner (one component, four tones)
- **Tones:** `info`, `success`, `warning`, `danger`. One component, tone is a prop. Replaces the current ad-hoc red/amber/green boxes scattered per screen.
- **Placement:** page-level banners sit directly under the header; contextual ones sit adjacent to what they describe.
- **Anatomy:** icon (tone-mapped) + message + optional single action + optional dismiss. Dismiss persistence (localStorage vs server vs none) is a declared prop, not improvised.
- **Rule:** transient confirmations are **toasts, not AlertCards**. AlertCards are for standing conditions (unverified email, Stripe not connected, day fully booked).

## 3.6 State cards (Empty / Loading / Error / Coming-soon)
- **EmptyState:** one component. Icon + headline + one-line guidance + optional single CTA. Every list/table uses it; filter-aware copy ("No customers match those filters" vs "No customers yet").
- **Loading:** skeletons via `<AsyncBoundary>`. The literal string "None" as a loading placeholder is banned.
- **Error:** AlertCard `danger` with a retry affordance.
- **Coming-soon:** **one** `ComingSoon` component (retire the current 4 variants), driven by the feature-flag registry. A coming-soon surface never renders dead inputs.

## 3.7 Card law
> A card has **one role, one primary affordance, and at most two explicit actions.** If it needs more, it's a page section or a drawer, not a card.

---

# 4. Form System

## 4.1 Two save models, declared per screen (never mixed)
1. **Explicit-save (SaveBar):** the default for multi-field config and for anything destructive or money-related. One sticky SaveBar governs the whole screen: shows dirty / saving / saved / error; disabled until dirty; no auto-save; offers **Discard** (today there is *no* discard anywhere — add it).
2. **Instant-save:** allowed only for **independent, low-risk, single-control** changes (a visibility toggle, a reorder, a single preference) where each control commits on change and shows its own inline confirmation (a quiet inline "Saved" or a toast). 

**Banned:** a screen where some fields auto-save and others need a SaveBar with no visible rule (today: Website Gallery mixes instant toggles, modal saves, and two inline heading SaveBars on one tab).

## 4.2 One SaveBar component
Replace the 4 current copies + `useSettingsForm` (which lives in only one file) with a single shared `useFormState` + `<SaveBar>`. Behavior: deep-compare dirty, optimistic-free save, success state auto-clears (~1.8s), error persists until next edit, **Discard** reverts to baseline.

## 4.3 Create / Edit container rule (kills the modal-vs-inline coin-flip)
Today create/edit is a modal for some entities and an inline panel for others with no rule. **The rule:**
- **Short objects (≤ ~6 fields, no nested lists):** **Modal.** (category, add-on, tag, booking question, customer create.)
- **Long / nested objects (advanced sections, sub-lists, conditional fields):** **Drawer** (preferred) or inline panel. (service with advanced rules, appointment, staff with schedule.)
- **The same entity uses the same container everywhere.** No entity is a modal in one place and inline in another.

## 4.4 Validation
- **Inline, field-level, on blur + on submit.** One presentation: the field shows its own error; the SaveBar reflects "fix N issues" and stays disabled while invalid.
- **Required fields are enforced client-side** (today onboarding enforces nothing). Mark required consistently.
- **Server errors** map back to the field where possible; otherwise a page-level AlertCard.

## 4.5 Destructive actions
- **One ConfirmDialog component.** Native `confirm()` and `alert()` are banned platform-wide.
- **Tiers of destructive confirmation:**
  - *Reversible* (hide, deactivate, soft-cancel): single confirm, plain.
  - *Irreversible, low blast radius* (delete a tag, a gallery image): confirm naming the object.
  - *Irreversible, high blast radius* (delete account, drop data): **type-to-confirm** (current delete-account modal is the gold standard — generalize it).
- **Destructive actions are visually isolated** and never the default focus.

## 4.6 Terminology consistency
A destructive verb means one thing platform-wide: **Cancel** = stop a booking (soft), **Delete** = remove a record, **Remove** = detach a link, **Decline** = reject a request. Today "Decline" and "Cancel" both soft-cancel; "Remove" and "Delete" are used interchangeably. Fix to the registry.

---

# 5. Data Management System

## 5.1 List vs Table — a real decision, not a default
- **DataList (card rows):** when rows are scanned/acted-on individually and have rich, irregular metadata (customers, appointments, requests). Mobile-first.
- **DataTable (columns):** when rows are *compared* across uniform attributes and need sorting (transactions, payouts, future reports). Real `<table>` semantics, sortable headers.
- **One component each.** Today "tables" are all hand-rolled card-lists even where comparison/sorting is wanted (Customers, Transactions). Pick per use; don't fake a table with divs when sorting is needed.

## 5.2 Search — server-side by default
- Search hits the API (the endpoints already support it). **Client-only search over a capped page is banned** (today Customers searches only the first 200 rows → everyone past 200 is invisible). Debounced, with a clear affordance and empty-state copy that echoes the query.

## 5.3 Filters
- **Chip row** is the standard (already common). Single-select vs multi-select is a declared property of the filter set.
- **Filters persist in the URL** (`?status=`, `?range=`) so a filtered view is shareable/bookmarkable and survives refresh. Today some read the URL but don't write it back — fix to read+write.
- Stat-strip cards and filter chips that represent the same cut must stay in sync (one drives the other).

## 5.4 Drawers vs Modals — strict roles
- **Drawer (right slide-in):** **record detail + contextual editing of that record.** Opens from a row. Lazy-loads full detail. Sectioned. Closes on Esc/backdrop/X. This is where "open a customer/appointment" goes.
- **Modal (centered / mobile bottom-sheet):** **focused create/edit of a short object, or a confirm/decision.** Short-lived, single-purpose.
- **Never** use a modal where a drawer belongs (browsing a rich record) or a drawer where a modal belongs (a yes/no confirm). One Drawer component, one Modal component, one ConfirmDialog.

## 5.5 Bulk actions
- A DataList/DataTable that supports bulk work has a **selection model**: row checkboxes + a contextual bulk-action bar that appears when ≥1 row is selected (replaces the toolbar). Define it once; today there are zero bulk actions anywhere, which won't scale (tagging, exporting, messaging clients).

## 5.6 Pagination / loading more
- **Cursor or "load more"** is the standard; hard caps (the 200-row Customers ceiling) are banned. The component owns fetch-on-scroll or an explicit "Load more". Counts shown where cheap.

## 5.7 Row → detail → action flow (canonical)
```
DataList row (RecordCard)
  → click row → Drawer (detail)
      → inline section edits (instant-save sections) or
      → "Edit" → Modal/Drawer per §4.3
      → contextual actions (link to owner screen for heavy actions; triage inline)
```

---

# 6. Dashboard Rules

## 6.1 What a dashboard IS
A dashboard is **read + triage + navigate**. It answers "what needs me now?" and routes the user to the owning screen to act. The current dashboard's 5-layer model is genuinely good and becomes the standard.

## 6.2 What does NOT belong on a dashboard
- Multi-field editing or settings.
- Anything that is the *only* place to perform an action (an action on the dashboard must also exist on its owner screen).
- More than one primary chart.
- Exhaustive lists (cap previews at ~6–8 with "view all").
- Configuration of any kind.

## 6.3 The Layer System (canonical, top→bottom by urgency)
```
Layer 1 — TODAY        next/now, today's schedule, today KPIs            (act-now)
Layer 2 — ATTENTION    pending requests, payment problems, quick actions (triage)
Layer 3 — PERFORMANCE  one revenue chart + booking/money snapshots       (trend)
Layer 4 — HEALTH       rates (avg ticket, return, no-show), new clients  (diagnose)
Layer 5 — GROWTH       opportunities, recent activity                    (improve)
```
Plus an above-the-fold **greeting + setup checklist (until complete) + platform announcement (one)**.

## 6.4 KPI hierarchy
- **Tier-1 KPIs** (≤4) live in Layer 1 as a stat strip; each is a filter-shortcut into its owner screen.
- **Tier-2 KPIs** live inside their snapshot cards (Layer 3/4).
- A KPI never appears in two layers. "Needs attention" count is the canonical urgency signal and is amber-aware.

## 6.5 Chart hierarchy
- **Exactly one primary chart** (revenue) with a time-range switch and click-to-detail. Everything else is a sparkline or a bar snapshot, never a second full chart. Future reports/analytics get their **own section** (Money → Reports), not more dashboard charts.

---

# 7. Section Audits

Format per section: **Current → Problems → Inconsistencies → Recommended → Final architecture.** Grounded in the Architecture Bible.

## 7.1 Dashboard
- **Current:** strong 5-layer overview; first-run gate; hosts WelcomeTour. Body inline in `page.tsx`; a separate file confusingly named `AppointmentsDashboard` is actually the Bookings hub.
- **Problems:** dashboard-local `StatusPill` differs from every other status pill; WelcomeTour cites non-existent "Settings → Domain" and "Billing tab"; some widgets have no skeleton.
- **Inconsistencies:** status palette #1 of 5; "Loading your dashboard…" vs other loading strings.
- **Recommended:** keep the layer model verbatim as the platform standard (§6). Adopt shared StatusBadge, AsyncBoundary. Fix tour copy. Rename `AppointmentsDashboard` → `BookingsHub` (it's not a dashboard).
- **Final:** Archetype A. The reference implementation of §6. No mutations that don't exist on owner screens.

## 7.2 Website
- **Current:** single 4,144-line `WebsiteHub` Editor/Builder with 10 tabs + live preview; 4 legacy dead components alongside it.
- **Problems:** uneven save model (settings bump preview, gallery/policy item saves don't); label≠key≠component naming; bespoke SEO coming-soon; `/editor/business` redirect lands here wrongly.
- **Inconsistencies:** its own SaveBar copy; "Top Banner/Header/Hero", "Extras/Additionals", "Before&After/Results" multi-naming.
- **Recommended:** keep as the canonical **Editor/Builder archetype (E)**. One save model across all panels (uniform preview refresh). Delete dead components. Normalize tab labels to the config and make every internal name match. Use the one `ComingSoon` for Introduction/Announcements/SEO. Fix the redirect.
- **Final:** Archetype E. Split-view, instant-save where independent (toggles/reorder), SaveBar per content panel — but the *same* rule on every tab. Lives in **Storefront** group.

## 7.3 Bookings → dissolve into Operate
- **Current:** "Bookings" is a hub mixing the daily calendar (Overview/Appointments) with config (Services, Staff, Availability, Booking Form, Waitlist).
- **Problems:** conflates *do* and *configure*; the hub file is misnamed; route-mode here but query-tab elsewhere; stats show literal "None" while loading.
- **Inconsistencies:** two status palettes within the appointment surfaces; "Bookings" vs "Appointments" vs "booking request" terminology.
- **Recommended:** **Eliminate "Bookings" as a label.** Promote **Calendar** (the appointment manager) to a first-class section at the top of **Operate**. Make **Services**, **Team** (Staff), **Availability**, and **Booking Form** their own Operate sections (or sub-tabs of Calendar where they're truly facets). Waitlist + Requests become sub-tabs of Calendar (they're booking demand), not of Availability.
- **Final:** Operate group = `Calendar · Availability · Services · Team`. The old `/editor/bookings` hub becomes a redirect to `/calendar`.

## 7.4 Availability
- **Current:** 8 sub-tabs (Smart Calendar, Date Drops, Capacity, After Hours, Squeeze-Ins, Waitlist, Requests, Advanced); two visual generations; no hub-level save (each tab saves differently); stale "After hours coming soon" teaser; dormant legacy fields.
- **Problems:** **8 sub-tabs violates the ≤6 cap**; Waitlist + Requests are *booking demand*, not *availability config*, parked here for convenience; four different save styles across tabs.
- **Inconsistencies:** tab label≠id≠component; square+white vs rounded+cream; `confirm()`/`alert()` mixed with inline.
- **Recommended:** Availability owns **time supply only**: `Calendar (overrides) · Date Drops · Capacity · After Hours · Squeeze-Ins · Advanced` (6). Move **Waitlist** and **Requests** to the **Calendar** section (demand). One save model across all panels (SaveBar). Delete dormant fields and the stale teaser. Unify the two visual generations structurally (same card/section components).
- **Final:** Availability = a focused Operate section, ≤6 sub-tabs, single save grammar.

## 7.5 Appointments → becomes "Calendar"
- **Current:** the real operational core — 6 filters, list/week/month views, inline create/edit, and **all three payment dialogs live here** (Mark paid, Refund, Charge balance).
- **Problems:** named "Appointments" while being the daily home; money actions live here but the "Payments" section can't take them (split brain); "None" while loading; two status maps in the file.
- **Inconsistencies:** status palette #3/#4; filter chips not URL-persisted in some views.
- **Recommended:** rename to **Calendar** and seat it at the top of Operate. **Keep the money actions here** — this is correct per Law 7 (act where the appointment lives); the *Payments section* is the monitor/ledger that links *into* these dialogs. Make that ownership explicit in both directions. Adopt shared StatusBadge + payment dialogs as the canonical money-action components, reused by anywhere that needs them.
- **Final:** Archetype B (list/week/month). Canonical home of appointment + per-appointment money actions.

## 7.6 Services
- **Current:** service list (drag reorder) + Categories panel + Add-ons panel + Packages teaser; create/edit inline for services, modal for category/add-on.
- **Problems:** no empty state for zero services; reorder is fire-and-forget (no feedback); mixed create patterns (inline service vs modal category) without a stated rule.
- **Inconsistencies:** "Remove" (service) vs "Delete" (category/add-on).
- **Recommended:** Operate section. Services = long/nested object → **Drawer** edit (per §4.3); Categories/Add-ons = short → **Modal** (already correct). Add EmptyState. Standardize reorder (drag + arrows + saved feedback) and reuse that everywhere reordering exists. Packages → one `ComingSoon`.
- **Final:** Archetype B with a Drawer editor for the rich object; modals for the short ones.

## 7.7 Staff → "Team"
- **Current:** staff cards (Active/Inactive) + per-card expandable Schedule (hours + blocked dates) inline.
- **Problems:** placeholder-email debt; reorder via numeric field only (a third reorder pattern); will need roles/permissions soon (teams).
- **Inconsistencies:** its own hours editor (third schedule UI vs Availability + legacy Hours).
- **Recommended:** rename to **Team** (forward-compatible with roles, multi-location assignment, permissions). Unify the three schedule editors into one shared weekly-hours component used by Team + Availability. Standardize reorder. Reserve a **Roles & Permissions** sub-tab slot.
- **Final:** Operate section "Team", with sub-tabs `Members · Schedules · (Roles)` as teams mature.

## 7.8 Customers
- **Current:** KPI cards + 9 filter chips + card-list + detail drawer; Overview tab duplicates the list; loyalty/accounts/reviews are coming-soon.
- **Problems:** **no edit of name/email/phone after create; no delete/archive; no export UI; no tag filter; client-only search capped at 200; silent drawer save failures.** These are the most severe functional gaps in the platform.
- **Inconsistencies:** phantom Overview tab; "table" is a faked card-list where sorting/bulk are wanted.
- **Recommended:** make it the reference **List/Management (B)** + **Drawer detail**. Remove the phantom Overview (or make it a real segments dashboard). Add full record edit, archive/merge, server search + pagination, tag filtering, bulk actions (tag/export/message), and wire the existing export route. Promote to the **Clients** group as its anchor; loyalty/reviews/marketing become **sibling sections** in Clients (not sub-tabs), so each can grow.
- **Final:** Clients group anchor. Customer profile may graduate from Drawer to Record page (C) with its own tabs (Activity / Payments / Notes / Marketing) as those features land.

## 7.9 Payments
- **Current:** read/monitor hub (Overview/Deposits/Transactions/Payouts) + a Settings tab that links to Settings; **money actions live in Appointments, not here.**
- **Problems:** the section named "Payments" cannot take a payment; Stripe setup reachable from 3 places; transactions are a faked table where a real sortable table belongs; three divergent status-pill maps.
- **Inconsistencies:** filter vocab differs between Deposits and Transactions; status maps #4/#5.
- **Recommended:** Payments = the **money ledger + payout monitor** (Money group). It explicitly **links into** the canonical per-appointment money dialogs (owned by Calendar) — make the relationship legible ("manage this charge →"). Transactions/Payouts become real **DataTables** (sortable). One Stripe-Connect setup screen owns onboarding; Payments + Integrations + Onboarding all **link** to it (Law 3). Unify status registry.
- **Final:** Money group. Monitor + ledger; actions delegated to Calendar's dialogs; one Stripe setup owner.

## 7.10 Integrations
- **Current:** catalog; only Stripe live; ~11 coming-soon tiles; reachable both as a sidebar item and a Settings sub-tab (which redirects).
- **Problems:** dual entry points; Stripe tile duplicates a setup that lives elsewhere.
- **Inconsistencies:** grey "coming soon" badge = a 4th coming-soon language.
- **Recommended:** keep as a single **catalog** in the Manage group. Each tile links to that integration's **one owner screen** (Stripe → the Stripe setup owner). Remove the Settings duplicate entry (or make Settings→Integrations a true link, not a redirect). Use the one `ComingSoon` tile variant. This is the natural home for future Marketplace-style connections.
- **Final:** Manage group catalog; pure router to owner screens.

## 7.11 Settings
- **Current:** 8 live panels + a 9th (Integrations) that redirects; Overview grid shows 7; SaveBar duplicated; Account uses per-section saves; Booking dual-writes two backends; Stripe + policies overlap other sections.
- **Problems:** the nav config, the overview grid, and the actual panels disagree on what's in Settings (three different lists); business profile split across Business + Preferences; policies edited here *and* in Website.
- **Inconsistencies:** 4 save styles; native confirms.
- **Recommended:** Settings = **business-wide configuration only**, Settings/Form archetype (D), one SaveBar everywhere (Account included). Resolve overlaps by ownership: **Business identity** = one Settings surface (merge Business + Preferences identity bits); **Policies** content owned by Website, **enforcement** owned by Booking-rules — link, don't duplicate; **Stripe/payment rules** owned by the one Payments-setup screen, surfaced under Money, *referenced* from Settings. Make the config, the grid, and the panels identical lists. Reserve sub-sections for **Locations** and **Roles**.
- **Final:** Manage group. Pure config, one save grammar, no duplicated capability.

## 7.12 Billing
- **Current:** subscription + plan picker + Stripe Customer Portal; **not in nav**; renders its own header.
- **Problems:** orphaned (only reachable by links; the WelcomeTour references a tab that doesn't exist); structurally outside the nav system.
- **Recommended:** put Billing in the **Money** group (or a persistent account menu) as a real section. It stays Cashier (BookReady-as-payee) and must never visually blend with Payments (Connect, tenant-as-payee) — distinct section, distinct language. Keep delegating card/invoice/cancel to the Stripe portal.
- **Final:** Money group section, in-nav, clearly separated from Payments.

---

# 8. Consistency Violations (and their resolutions)

| # | Violation (today) | Resolution (v1) |
|---|---|---|
| 1 | **4 SaveBars** + `useFormState` in one file | One `useFormState` + `<SaveBar>` (Law 4, §4.2) |
| 2 | **5 status/payment pill maps**, different palettes | One `StatusBadge` registry keyed by domain status (§ below) |
| 3 | **3 weekly-hours editors** (legacy Hours, Availability, Staff) | One `WeeklyHoursEditor` shared by Team + Availability (§7.7) |
| 4 | **Payments actions split** from Payments section | Ownership made explicit: actions in Calendar, ledger in Payments, both cross-link (Law 7) |
| 5 | **Stripe setup in 3 places** | One Stripe-setup owner; others link (Law 3) |
| 6 | **Policies in 2 places** (Website + Booking) | Content→Website, enforcement→Booking-rules; link not duplicate |
| 7 | **Business profile split** across 2 Settings tabs | Merge into one Business surface |
| 8 | **Waitlist in 2 nav spots**; Requests miscategorized | Both become Calendar sub-tabs (demand), one component |
| 9 | **Customers Overview = list** (phantom) | Remove or replace with a real segments view |
| 10 | **4 "coming soon" treatments** | One `ComingSoon` + feature-flag registry (Law 10) |
| 11 | **native `confirm()`/`alert()`** everywhere | One `ConfirmDialog`; toasts for transient (Law 5) |
| 12 | **no toast system** | Add one `Toast` system; silent actions (Copy Link, drawer saves) emit toasts |
| 13 | **query-tab vs route** split | All sub-tabs are routes (Law 2) |
| 14 | **sidebar hardcodes nav** | Sidebar derives from config (Law 1) |
| 15 | **section eyebrow ≠ active item** (Integrations) | Eyebrow derives from active section (Law 1) |
| 16 | **label ≠ key ≠ component** naming | Canonical noun per concept (terminology registry below) |
| 17 | **literal "None" while loading**, mixed loaders | One `AsyncBoundary` (skeleton/empty/error) |
| 18 | **client search + 200 cap** | Server search + pagination (§5.2, §5.6) |
| 19 | **broken `/editor/business` redirect** | Redirects must resolve to valid routes (§1.6) |
| 20 | **modal-vs-inline create coin-flip** | Container rule by object size (§4.3) |

### Terminology registry (canonical nouns/verbs)
- **Calendar** (not "Bookings", not "Appointments" as a section). **Team** (not "Staff"). **Clients**/"Customers" — pick one platform-wide (recommend **Clients**, industry-standard).
- **Cancel** (soft-stop a booking) · **Decline** (reject a request) · **Delete** (destroy a record) · **Remove** (detach a link) · **Deactivate/Hide** (reversible).
- One name per content concept: Header (not Top Banner/Hero), Before & After (not Results), Extras (not Additionals) — choose the customer-facing word and use it in code too.

### Status system (one registry)
Define status enums + their label + tone in **one** place, consumed by every badge:
- **Appointment:** pending · confirmed · completed · no_show · cancelled.
- **Payment:** unpaid · deposit_pending · deposit_paid · paid · refunded · partially_refunded · failed · disputed (disputed always outranks).
- **Connect/onboarding:** not_connected · onboarding_started · pending · active · restricted.
- **Generic entity:** active · inactive · archived · draft.
No screen defines its own colors/labels for these again.

---

# 9. Future-Proof Architecture

The structure must absorb **multi-location, teams, SMS, marketing, loyalty, memberships, reviews, AI, marketplace, mobile** without a nav rewrite. How each lands:

## 9.1 Multi-location (the big one) — reserve Tier 0 now
- Add a **Context Switcher** at the very top of the sidebar (Tier 0). Single-location tenants never see it. Selecting a location **scopes every list, metric, calendar, and report** (Law 9).
- Settings gains a **Locations** sub-section (Manage group). Entities get an optional `location_id`; "all locations" is a valid scope for owners.
- Because every screen already declares its data as "scoped to the current context," this is additive — no screen's structure changes, only its query gains a scope.

## 9.2 Teams / roles & permissions
- **Team** section (renamed Staff) gains a **Roles** sub-tab. Permissions gate **nav visibility** (the nav config already drives everything → a role simply filters the config) and **action availability** (actions check capability). No per-screen permission spaghetti — it's two enforcement points: nav config + action guards.

## 9.3 SMS
- Not an "integration tile" (it's first-party). SMS settings live under **Notifications** (Settings) alongside email; SMS *campaigns* live under **Marketing** (Clients group). Consumption/allowance shows in **Billing**. Three clean homes, no new top-level nav.

## 9.4 Marketing / Loyalty / Memberships / Reviews
- All four are **sections inside the Clients group** (not sub-tabs of Customers — each is big enough to own a section, and grouping keeps the sidebar scannable). They reuse: DataList + Drawer (campaigns, members), Settings/Form archetype (program config), the status registry (campaign states), and the one `ComingSoon` until shipped. The Clients group was sized for exactly this.

## 9.5 AI tools
- AI is **not a section** — it's an **assistive layer** that appears in-context (suggested replies in messaging, smart scheduling hints in Calendar, copy generation in Website). Reserve a consistent "AI affordance" slot (a labeled secondary action) so AI features attach to existing screens rather than spawning a parallel nav. A single **AI settings** panel (Settings) governs opt-in/limits.

## 9.6 Marketplace
- Two faces: **inbound** (BookReady's directory listing the business) = a sub-area of **Storefront** (it's public presence, like Website); **outbound** (connecting third-party tools) = the **Integrations** catalog (already built for this). No new top-level nav.

## 9.7 Mobile apps
- Because Tier-1 is **grouped** and sub-tabs are **routes**, mobile is a mechanical projection: bottom tab bar = top groups; section sub-tabs = scroll strip; drawers = full-screen sheets; context switcher = header. New features inherit mobile placement automatically by virtue of joining a group. No separate mobile IA.

## 9.8 The scalability test (apply to every new feature)
> A new feature is architecturally sound only if it can answer: *(1) which group does it join? (2) is it a section or a sub-tab? (3) which archetype is its main screen? (4) which existing components does it reuse? (5) how does it scope to a location? (6) which role sees it?* If any answer is "a new bespoke pattern," redesign until it isn't.

---

# 10. Final Deliverable — Rule Sets A–J

### A. Global UI Rules
1. One nav source of truth; everything derives from it. 2. URL path = nav state; query = view state. 3. One capability, one owner screen. 4. One component per job (SaveBar/Confirm/StatusBadge/EmptyState/Drawer/Modal/Toast/DataList/DataTable). 5. Systematic feedback (toast/banner/skeleton/empty). 6. Declared save model per screen. 7. Read where you browse, act where you own. 8. Progressive disclosure by tier. 9. Everything scopes to a context. 10. Uniform coming-soon.

### B. Navigation Rules
3 tiers + reserved Tier-0 context switcher; grouped primary nav (Operate/Clients/Storefront/Money/Manage); route-based sub-tabs (≤6); one primary action per page; eyebrow matches active section; shallow back-links (drawer over deep nesting); utility routes must be in-nav; redirects must resolve; mobile = group→bottom-bar projection.

### C. Page Structure Rules
Seven archetypes (Dashboard, List/Management, Record, Settings/Form, Editor/Builder, Wizard/Focus, Coming-soon). Shared header stack + AsyncBoundary + action placement across all. The brief's "header→stats→filters→content→drawer" is the **List/Management** archetype only.

### D. Card Rules
Closed role set (Stat/Management/Record/Info/Alert/State). One role, one primary affordance, ≤2 explicit actions per card. AlertCard = one component, four tones. EmptyState/Loading/Error/ComingSoon = shared components.

### E. Form Rules
Two declared save models (explicit SaveBar / instant), never mixed. One SaveBar + Discard. Create/edit container by object size (modal=short, drawer=long). Inline blur+submit validation, client-enforced required. Destructive = ConfirmDialog with tiered confirmation (type-to-confirm for high blast radius). No native confirm/alert.

### F. Modal Rules
Modal = focused create/edit of a short object OR a confirm/decision. Centered desktop / bottom-sheet mobile, Esc+backdrop close, one primary action, scroll-locked. Never used for browsing rich records.

### G. Drawer Rules
Drawer = record detail + contextual editing, opened from a row, right slide-in, lazy-loaded, sectioned, no back-link. Heavy actions link to owner screens; triage allowed inline; section edits may instant-save.

### H. Table / List Rules
DataList (cards) for scan/act; DataTable (sortable columns) for compare/sort. Server search; URL-persisted filters; selection model + bulk-action bar; cursor/load-more (no hard caps); canonical row→drawer→action flow.

### I. Dashboard Rules
Read+triage+navigate only; 5-layer model (Today/Attention/Performance/Health/Growth); ≤4 Tier-1 KPIs as filter-shortcuts; exactly one primary chart; previews capped with "view all"; no config, no sole-source actions.

### J. Future Expansion Rules
Reserve Tier-0 context switcher (multi-location); roles filter the nav config + guard actions (teams); SMS→Notifications+Marketing+Billing; Marketing/Loyalty/Memberships/Reviews→Clients-group sections; AI→in-context assistive layer (not a section); Marketplace→Storefront(inbound)+Integrations(outbound); mobile = mechanical projection of grouped nav. Every new feature passes the 6-question scalability test.

---

# BookReady UI Architecture v1 — The Blueprint

**The model in one screen:**
```
┌ Tier 0  Context switcher (account / location)         [reserved; hidden until multi-location]
│
├ Tier 1  PRIMARY NAV (grouped, from config)
│   ▸ Dashboard
│   ▸ OPERATE     Calendar · Availability · Services · Team
│   ▸ CLIENTS     Customers · (Marketing · Loyalty · Memberships · Reviews)
│   ▸ STOREFRONT  Website · (Marketplace)
│   ▸ MONEY       Payments · Billing
│   ▸ MANAGE      Settings · Integrations · (Locations · Roles)
│
├ Tier 2  SECTION NAV  → /section/subtab routes, ≤6, from config
│
└ Tier 3  VIEW STATE   → ?status= ?range= ?focus=  (filters/focus only)

Every page = one of 7 archetypes, same header stack, same async/feedback/components.
Every capability has one owner screen; everything else links to it.
Every status, save, confirm, empty, and coming-soon uses the one shared component.
Everything scopes to the current context; roles filter the nav config.
```

**What changes from today (the migration spine), in priority order:**
1. **Componentize the primitives** — SaveBar, ConfirmDialog, StatusBadge registry, EmptyState, AsyncBoundary, Toast, Drawer, Modal, DataList/DataTable. (Unblocks every other fix; pure consolidation, no IA change.)
2. **Fix the nav source of truth** — sidebar derives from config; eyebrow matches section; fix the broken redirect; put Billing in nav. (Cheap, high-trust.)
3. **Resolve ownership overlaps** — one Stripe-setup owner; policies content vs enforcement; merge Business+Preferences; Payments↔Calendar action cross-links. (Removes the split-brain.)
4. **Re-group + rename the IA** — dissolve "Bookings" into Operate; Appointments→Calendar; Staff→Team; move Waitlist/Requests under Calendar; trim Availability to ≤6. (The structural correction.)
5. **Migrate `?tab=` → routes** with redirect aliases for one release. (Mechanical, deferrable.)
6. **Close the Customers CRM gaps** — record edit, archive, server search+pagination, tag filter, bulk actions, export. (Highest functional debt.)
7. **Reserve the future** — Tier-0 context switcher shell, Clients-group section slots, roles-as-config-filter, one ComingSoon registry. (No user-visible change; unblocks scale.)

**The test for "is this on-architecture?":** any developer building any new screen should be able to point at (a) its group, (b) section-or-subtab, (c) archetype, (d) the shared components it reuses, (e) its context scope, (f) its role gate — using only this document. If they reach for a bespoke pattern, the architecture (or the feature scoping) is wrong.

---

*BookReady UI Architecture v1 — structural blueprint. Pairs with `docs/tenant-architecture-bible.md` (as-built + issues). Colors, type, and spacing are intentionally undefined here; they belong to the visual system, which slots into — and is constrained by — this architecture.*
