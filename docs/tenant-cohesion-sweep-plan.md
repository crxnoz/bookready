# Tenant Dashboard — Cohesion Sweep Plan

> Execution plan to bring the **entire tenant dashboard** into compliance with the three design docs:
> `tenant-architecture-bible.md` (as-built) · `bookready-ui-architecture-v1.md` (structure) · `bookready-visual-system.md` (tokens).
>
> **Core principle: build the foundation once, then touch each screen exactly once.** Sweeping screens before tokens/primitives exist = rework. So: foundation → global mechanical passes → vertical per-section adoption → cleanup.

## Scope guardrail
- **In scope (this sweep):** tokens (color/border/**spacing**/type), the SHARP ruling (radius 0), shared primitives, status + feedback unification, save-model unification, dead-code removal, per-section visual adoption.
- **Deferred to "the restructure" (separate effort, after this):** nav re-grouping, renames (Bookings→Calendar, Staff→Team), `?tab=`→route migration, Customers CRM functional gaps, multi-location scaffolding.

## Two owner rulings (binding)
1. **SHARP everywhere** — `radius: 0`, no `rounded-*`, no pills. Strip all 60 rounded usages.
2. **Gradients reserved** — only on Coming-Soon + designated "marquee" feature moments; never on functional chrome.
3. **Spacing consistent** — two grids only (4px layout / 2px micro); component spacing standards verbatim (Visual System §5).

---

## Phases

| Phase | Objective | Parallel? | Risk | Ships |
|---|---|---|---|---|
| **0 · Token Foundation** | Color/border/status/spacing/type tokens into `tailwind.config.ts`, *additive*, zero visual change | — | none | invisibly |
| **1 · Primitive Library** | Build the canonical sharp, token-driven shared components | ✅ heavy | low | invisibly |
| **2 · Guardrails + Sharp Strip** | Lint bans (`rounded-*`, inline hex, arbitrary `text-[px]`, off-grid spacing); flatten radius globally | ✅ by folder | low–med | per batch |
| **3 · Global Systems** | Status registry+StatusBadge, Toast, AsyncBoundary, ConfirmDialog wired app-wide | partial | med | per system |
| **4 · Vertical Section Sweeps** | Per section: primitives + tokens + spacing + one save-model + real states; one pass each | ✅ across sections | med | per section |
| **5 · Dead Code + Drift** | Delete 5 dead components, fix `/editor/business` redirect, strip stray blur, collapse gradients | ✅ | low | once |
| **6 · Cohesion QA + Deploy** | Review each section vs the 3 docs; build; deploy; smoke | — | — | final |

### Phase 0 — Token Foundation (DOING FIRST)
Add to `tailwind.config.ts`, alongside existing values (no overrides → invisible):
- Borders (3 steps): `hairline-soft` 0.08 · `hairline` 0.12 · `hairline-strong` 0.20.
- Status: `success`/`success-bg`, `warning`/`warning-icon`/`warning-bg`, `danger`/`danger-bg`.
- Ink: `faint-text` (#B0A99F placeholder/disabled).
- Gradient stops: `soon-from`/`soon-to`.
- Keep existing: cream, near-black, blush, lavender, muted-text, border.
- Type + spacing = **documented allowed subsets** (Visual System §4.1, §5), enforced by Phase-2 lint (not config, since Tailwind already ships the scale).

### Phase 1 — Primitive Library (parallelizable)
`Button` (extend), `Input/Textarea/Select`, `StatusBadge`, `Card`, `SaveBar`+`useFormState`, `ConfirmDialog`, `Toast`, `EmptyState`, `AsyncBoundary`, `Modal`, `Drawer`, `Toggle`, `Banner`. All sharp, token-driven, spacing-standard from day one.

### Phase 2 — Guardrails + Sharp Strip (mechanical)
Lint first (prevents regression → each screen touched once), then flatten radius. Fastest path: override `borderRadius` scale → 0 in config (instant global flatten), then remove now-no-op `rounded-*` classes for cleanliness.

### Phase 3 — Global Systems
Status registry (one enum→label→tone) behind `StatusBadge`; Toast provider (fixes silent Copy Link + silent drawer saves); `AsyncBoundary` (kills literal "None" loaders); `ConfirmDialog` (removes native `confirm`/`alert`).

### Phase 4 — Vertical Section Sweeps (the bulk)
Order by visibility/traffic:
`Dashboard → Appointments → Customers → Availability → Services → Staff → Website → Payments → Settings → Billing → Integrations → Booking-Form/Waitlist/Requests`
Each: swap hand-rolled → primitives, hexes → tokens, padding/gaps → §5 standards, unify save model + Discard, real empty/loading/error. Independent → parallel worktrees, ship per section.

### Phase 5 — Dead Code + Drift
Delete `GalleryEditor`, `PoliciesEditor`, `BusinessForm`, `LivePreview`, `HoursEditor`; fix `/editor/business` redirect; remove stray `backdrop-blur`; collapse gradients to the 2 tokens; drop "✓" glyph.

### Phase 6 — Cohesion QA + Deploy
Per-section compliance check (zero inline hex, zero `rounded-*`, spacing on-grid, only primitives, registry-driven status), `npm run build`, deploy, smoke.

---

## Throughput model ("maximize workload")
- **Sequential gate:** 0 → 1 (everything depends on them). Keep tight.
- **Then parallel fans:** Phase 2, Phase 4 (across sections), Phase 5 run concurrently in separate worktrees once primitives exist.
- **Continuous safe deploys:** 0–1 invisible; 2 + each Phase-4 section ship independently — never one giant risky PR.
- **Guardrails up front (Phase-2 lint):** each screen touched once, can't drift back.

## Definition of done (per screen)
Zero inline hex · zero `rounded-*` · spacing only from §5 grids · type only from §4.1 scale · only shared primitives · status only from the registry · one declared save model · real empty/loading/error states.
