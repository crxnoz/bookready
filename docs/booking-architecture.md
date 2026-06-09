# BookReady Booking Architecture Refactor

> **Status: PHASE 1 IN PROGRESS — kicked off 2026-06-09.**
>
> The customer-facing booking flow is `web/packages/platform/src/booking/
> PlatformBookingFlow` (currently the file `LushStudioBooking.tsx`), wrapped
> by each template's `*Booking.tsx` shim. One engine, three skins. The
> engine is correct and battle-tested but carries three pieces of debt that
> compound every time we touch it:
>
> 1. **Concrete colors baked into the base CSS.** Templates have to fight
>    cascade wars to restyle, with widespread `!important`. New CTA classes
>    don't get restyled unless someone remembers to add a TFR override per
>    template. We hit this on 2026-06-09 when the "Go to dashboard" CTA
>    rendered black-on-black under TheFadeRoom because `.brk-booking-
>    account-followup-cta` had no matching override.
> 2. **Historical naming.** File + export + DOM class + CSS const all carry
>    the "Lush" prefix from when Lush was the only template. Aliases hide it
>    behind the barrel, but every read costs a "wait, why Lush?" cycle.
> 3. **No tests.** A 2,413-line component that handles money has zero
>    automated coverage. Every deploy that touches booking is brave.
>
> This roadmap fixes those three pieces in the order that maximizes safety
> and minimizes risk per phase. Each phase ships independently and the
> booking keeps working between phases — no big-bang rewrite.

## Phases

| # | Phase                       | What ships                                  | Status      |
| - | --------------------------- | ------------------------------------------- | ----------- |
| 1 | Theme tokens                | `--brk-booking-*` variables + Lush parity   | shipped     |
| 2 | Rename + Lush owns tokens   | Engine consumes `--brk-booking-*`; Lush defines `--lush-*` | **active**  |
| 3 | TFR re-paint                | TFR override file drops `!important` calls  | shipped     |
| 4 | VT (+ 4 more) re-paint      | Bottega / Petale / Opaline / Blackline / VT | shipped     |
| 5 | Template shell deduplication| `<TemplateBookingShell>` shared component   | pending     |
| 6 | Smoke tests                 | Playwright happy-path against staging tenant| pending     |
| 7 | Split the engine            | Per-step components under `BookingSteps/`   | deferred    |

**Phase order changed 2026-06-09:** swapped what was Phase 2/3 (re-paints)
with Phase 4 (rename) per architecture review. Rationale: re-paints touch
the same lines the rename would touch — doing rename first means each shim
gets rewritten once, not twice. Scope expansion: discovered **7 templates**
(not 3) use `--lush-*` and `.lush-template`. All 7 must continue rendering
correctly post-Phase-2; the chosen approach (alias `--brk-booking-X: var
(--lush-X, default)` in the engine) keeps every shim working without any
shim file changes in Phase 2 itself.

Phase 7 is deferred until a substantive booking feature motivates the split.
Splitting a 2,413-line component speculatively, with no tests, is a recipe
for regressions; once Phase 6 is in place and a real feature shows up, the
split has a safety net.

---

## Phase 1 — Theme tokens

**Goal:** every color, border, border-radius, font, and spacing in
`lushBookingCss.ts` that varies per-template lives behind a CSS variable
with a sensible default that matches today's Lush values. Lush itself
gets no visual change.

**Why this is the keystone:** today's black-on-black bug, and every
future bug shaped like it, becomes impossible. Adding a new component to
the engine no longer requires anyone to remember to add three template
overrides — the new component just consumes `var(--brk-booking-cta-fg, ...)`
and inherits whatever the wrapping template defines.

**Token taxonomy (proposed):**

```css
/* Surfaces */
--brk-booking-bg              /* page bg; default transparent */
--brk-booking-card-bg         /* white card surface */
--brk-booking-card-bg-soft    /* cream/secondary card */
--brk-booking-card-border     /* hairline */

/* Text */
--brk-booking-fg              /* primary text */
--brk-booking-fg-muted        /* secondary text */
--brk-booking-fg-on-accent    /* text on accent fill */
--brk-booking-fg-on-cta       /* text on dark CTA */

/* Accent (the brand-pink role) */
--brk-booking-accent          /* solid */
--brk-booking-accent-soft     /* 18% tint */
--brk-booking-accent-rgb      /* raw rgb for glow */

/* Calls to action */
--brk-booking-cta-bg          /* dark button */
--brk-booking-cta-bg-hover    /* dark button hover */
--brk-booking-cta-fg          /* text on cta */

/* Form fields */
--brk-booking-input-bg
--brk-booking-input-border
--brk-booking-input-focus-ring

/* Typography */
--brk-booking-font-serif
--brk-booking-font-sans
--brk-booking-font-ui

/* Hairlines + status */
--brk-booking-rule
--brk-booking-success-bg
--brk-booking-warning-bg
--brk-booking-danger-bg
```

**Sequencing inside Phase 1:**

- **1a — Audit.** Read every concrete value in `lushBookingCss.ts`, group
  into the taxonomy above. Adjust the taxonomy if real usage demands it.
- **1b — Drop in tokens with Lush defaults.** Replace each concrete value
  with `var(--brk-booking-X, <lush-current-value>)`. The `, <default>`
  guarantees Lush behavior is unchanged when no template overrides.
- **1c — Verify Lush parity.** Hard-refresh `lushstudio.bkrdy.me/book` and
  visually confirm nothing moved a pixel. Snapshot a screenshot for the
  before/after record.
- **1d — Ship.** Deploy. The variables are live but no template consumes
  them yet, so all three templates render identically to today.

**Acceptance:** Lush, TFR, VT all render visually identical to pre-Phase-1.
No `!important` is added. No template shim file changes.

---

## Phase 2 — Rename + Lush owns tokens (Option 1)

**Goal:** the canonical token namespace in the booking engine is
`--brk-booking-*`. Lush owns its own `--lush-*` tokens, defined in
`LushStudioTemplate.tsx`, not borrowed from the engine. Templates can
override either name; the engine's aliases connect them.

**Approach (alias-via-fallback):**

```css
/* Engine — was:
.lush-template {
  --lush-bg:   #F6F3EE;
  --lush-text: #0E1111;
}
.X { color: var(--lush-text); }

/* Engine — now:
.lush-template, .brk-booking-root {
  --brk-booking-bg:   var(--lush-bg,   #F6F3EE);
  --brk-booking-text: var(--lush-text, #0E1111);
}
.lush-template .X, .brk-booking-root .X { color: var(--brk-booking-text); }

/* LushStudioTemplate.tsx — now provides its own --lush-* tokens */
.lush-template {
  --lush-bg:   #F6F3EE;
  --lush-text: #0E1111;
}
```

**Why this approach:**

1. **Lush owns its tokens (Option 1).** `LushStudioTemplate.tsx` is now
   the source of truth for `--lush-*`. The engine only defines its
   canonical names.
2. **All 7 shims keep working unchanged.** They wrap in `.lush-template`
   and override `--lush-X` — the engine's alias `var(--lush-X, default)`
   reads their override transparently. Zero shim file changes in Phase 2.
3. **Cascade-anchor selectors get a sibling.** `.lush-template .X` is
   joined by `.brk-booking-root .X` in every engine rule. Both selectors
   have 0,2,0 specificity, both beat `.tfr-template a` (0,1,1) — so the
   cascade-fight bug class is fixed for the rules that already use the
   anchor pattern. (The 4-5 bare `.brk-booking-X` rules that don't use
   the anchor are addressed at the end of Phase 2 by adding the anchor
   prefix.)
4. **Phase 3+ (re-paints) become small.** TFR/VT/etc. can drop their
   `!important` rules once they know the engine wins the cascade
   without `!important`. Phase 2 makes that possible.

**Files changed:**

- `web/packages/platform/src/booking/lushBookingCss.ts` — engine var
  rename + selector dual-anchor + bare-class anchor prefix
- `web/templates/lushstudio/LushStudioTemplate.tsx` — adds
  `LUSH_PAGE_TOKENS_CSS` const that defines `--lush-*` at
  `.lush-template`; injects it before `<style>{LUSH_CSS}</style>`

**Not changed in Phase 2:**

- 6 other template shims (TFR, VT, Bottega, Petale, Opaline, Blackline)
- File names (`LushStudioBooking.tsx` etc.) — defer to a small follow-up
- Constant rename `LUSH_CSS` → `PLATFORM_BOOKING_CSS` — same
- `.lush-auth-modal-*` class rename — same

**Acceptance:** all 7 templates render visually identical to post-Phase-1.
The `.tfr-template a` cascade-fight bug we shipped a fix for on
2026-06-09 should be solvable without the TFR-side `!important`
override; Phase 3 will verify by deleting that override.

---

## The size-vs-style contract (locked 2026-06-09)

Founder direction, applied from Phase 3 forward:

| What                       | Owner    | Examples                                  |
| -------------------------- | -------- | ----------------------------------------- |
| Layout dimensions          | Engine   | padding, margin, gap, width, max-width    |
| Typography sizing          | Engine   | font-size, line-height, letter-spacing    |
| Component sizing           | Engine   | button padding, input padding, card padding |
| Structure                  | Engine   | display, flex/grid, layout direction      |
| Border radius              | Template | sharp / soft / pill per surface           |
| Button shape               | Template | rect, soft, pill                          |
| Colors + backgrounds       | Template | every fg/bg/border-color                  |
| Fonts                      | Template | font-family + font-weight                 |
| Decorations                | Template | text-shadow, box-shadow, transitions      |

The engine exposes radius tokens (`--brk-booking-radius-card / -cta / -input`)
so templates pick their shape without duplicating padding/font-size in
override rules. If a template rule sets `font-size`, `padding`, `gap`,
`margin`, `width`, or `line-height` on a `.brk-booking-*` selector, it
violates the contract and should be removed.

The outer chrome (the wrapper that POSITIONS the booking inside the
template's page — e.g., `.tfr-booking-frame { padding: ... }`) is outside
this contract and stays template-driven.

---

## Phase 3 — TheFadeRoom re-paint

**Goal:** `TheFadeRoomBooking.tsx` sets the `--brk-booking-*` variables
once at its scope root, then deletes the surgical `!important` overrides
that were fighting the cascade. The override file should shrink from
~600 lines to ~100 lines (template-specific layout only — fonts, special
glow effects, anything that isn't recolor).

**Acceptance:**
- No `!important` on `color`, `background`, `border-color` properties for
  any `.brk-booking-*` selector in `TheFadeRoomBooking.tsx`.
- TFR booking renders pixel-equivalent to today.
- Adding a new colored component to `lushBookingCss.ts` requires zero
  changes in `TheFadeRoomBooking.tsx`.

---

## Phase 3 — Velvet Theory re-paint

Same as Phase 2 for VT. After this phase the only remaining template-
specific CSS is genuine layout / font / decorative work.

---

## Phase 4 — Rename + drop `.lush-template`

**Goal:** finish the M2c rename the codebase has been deferring.

- `LushStudioBooking.tsx` → `PlatformBookingFlow.tsx`
- `lushBookingCss.ts` → `platformBookingCss.ts`
- `LushCustomerAuth.tsx` → `PlatformCustomerAuth.tsx`
- `LushCustomerAccountWidget.tsx` → `PlatformCustomerAccountWidget.tsx`
- DOM class `.lush-template` deleted from every shim and every CSS rule
- Barrel exports become canonical (no `as` aliases)

This is safe to do now because Phases 1-3 already detangled the cascade
from the wrapping class. The `.lush-template` wrapper exists only because
old TFR/VT override selectors needed it as a specificity anchor; once
overrides are gone, the anchor is dead weight.

**Acceptance:** repo grep for `lush-template`, `LushStudioBooking`,
`LUSH_CSS`, `LushCustomerAuth` returns zero matches outside the
`web/templates/lushstudio/` brand directory.

---

## Phase 5 — Template shell deduplication

**Goal:** the three shim files are identical nine-line wrappers. Extract:

```tsx
// web/packages/platform/src/booking/TemplateBookingShell.tsx
export function TemplateBookingShell({
  themeCss,
  scopeClass,
  children,
}: { themeCss: string, scopeClass?: string, children: ReactNode }) {
  return (
    <CustomerAuthProvider>
      <style>{PLATFORM_BOOKING_CSS}</style>
      {themeCss ? <style>{themeCss}</style> : null}
      <div className={cn('brk-booking-root', scopeClass)}>
        {children}
      </div>
    </CustomerAuthProvider>
  )
}
```

Each template shim shrinks to ~30 lines: import shell, define theme CSS
(if any), render `<TemplateBookingShell themeCss={TFR_THEME_CSS}>
<PlatformBookingFlow {...props} /></TemplateBookingShell>`.

**Acceptance:** TFR / VT / Lush shims each under 50 lines. Adding a new
template = copy a shim, swap theme CSS, done.

---

## Phase 6 — Smoke tests

**Goal:** Playwright run against staging that books a $50 deposit-required
service end-to-end and verifies the appointment row was written with
`payment_status='paid'`.

**Prereqs:**
- Staging environment (already in pre-launch backlog as item #190).
- A seeded test tenant with one bookable service, Stripe test mode wired.

**Test cases (in order of importance):**

1. **Happy path, deposit required.** Pick service → pick date → pick time
   → fill form → Stripe test card → confirm "All set" card renders →
   verify DB row written with `payment_status='paid'`, `status='confirmed'`.
2. **Abandoned checkout.** Pick through to Stripe → close tab. Verify
   `ExpirePendingPayments` cron flips the row to `cancelled` within 15 min.
   (This is the bug we shipped a fix for on 2026-06-09; lock it in.)
3. **Already-authed dashboard CTA visible.** Sign in as customer → book →
   confirm "Go to dashboard" CTA renders with white text on dark fill
   (the bug we shipped a fix for on 2026-06-09; lock it in).
4. **Cap exceeded.** Customer with a same-day booking tries to book a
   second appointment same day → 422 with copy "you already have a booking".

CI: run on every PR that changes `web/packages/platform/src/booking/` or
`api/app/Http/Controllers/Api/PublicBookingController.php`.

---

## Phase 7 — Split the engine (deferred)

`LushStudioBooking.tsx` is 2,413 lines: 5 step bodies + state machine +
Stripe handoff + customer-auth integration + account-followup cards, all
inline. Splitting is correct in the long run, but speculative splitting
without tests is risky and the payoff is realized only when a future
feature actually benefits from the split.

**Trigger:** the next substantive booking feature (e.g. "insert pick-a-
staff step between service and date", or "support multi-service single
appointment") that would benefit from working in one step file at a time.
At that point: extract steps to `BookingSteps/Service.tsx`,
`BookingSteps/Date.tsx`, `BookingSteps/Time.tsx`, `BookingSteps/Form.tsx`,
`BookingSteps/Confirm.tsx`. Keep state machine in the shell.

---

## Engineering notes

**Concrete-value audit (Phase 1a) findings — 2026-06-09:**

Big revision to the diagnosis. The engine **already has** a token system at
`.lush-template` scope (lines 21-55 of `lushBookingCss.ts`):

```css
.lush-template {
  --lush-bg:    #F6F3EE;   --lush-card:    #FFFFFF;
  --lush-text:  #0E1111;   --lush-muted:   #6B7280;
  --lush-pink:  #7FAF9A;   --lush-on-pink: #FFFFFF;
  --lush-pink-soft: #B3D0C2;
  --lush-dark-border: rgba(14,17,17,0.10);
  /* fonts: --lush-script, --lush-molle, --lush-serif, ... */
}
```

TFR + VT shims ALREADY re-point these (see `.tfr-booking-inner.lush-template
{ --lush-bg: transparent; --lush-text: var(--tfr-fg); ... }`). The token
system works for everywhere it's used.

The bug is that individual rules slipped hex through the cracks. 117 hex
literals total in the file; top frequency:

| Count | Hex      | What it's actually used for                     | Action                                    |
| ----- | -------- | ----------------------------------------------- | ----------------------------------------- |
| 25    | `#121212`| Dark CTA fill + dark-text-strong in a few spots | Add `--lush-cta-bg`, swap                 |
| 21    | `#FFFFFF`| White card surface + text-on-dark-CTA           | Use `--lush-card` + new `--lush-cta-fg`   |
| 13    | `#6B7280`| Muted text                                       | Swap to existing `--lush-muted`           |
| 4     | `#B91C1C`| Danger text                                      | Add `--lush-danger-fg`                    |
| 2     | `#F8F6F2`| Soft cream card (followup card)                 | Add `--lush-card-soft`                    |
| 2     | `#2a2a2a`| CTA hover state                                  | Add `--lush-cta-bg-hover`                 |
| 2     | `#FEF2F2`| Danger bg light                                  | Add `--lush-danger-bg`                    |
| 2     | `#FECACA`| Danger border                                    | Add `--lush-danger-border`                |
| 2     | `#c4bcb6`| Input placeholder                                | Add `--lush-input-placeholder`            |
| 1×14  | various  | Social brand gradients (TikTok, IG, etc.)       | LEAVE — external brand colors             |
| 1×4   | various  | Token definitions themselves                    | LEAVE — these ARE the tokens              |

**Implication for the roadmap:**

- No rename to `--brk-booking-*` in Phase 1. The existing `--lush-*` names
  work fine and the template shims already override them. Renaming in
  Phase 1 would break the override layer that's already working.
- Phase 1 work is mechanical: add the 7 new slots above, then sed-replace
  the hex literals. Lush parity is automatic (defaults match).
- Phase 4 still does the `--lush-*` → `--brk-booking-*` rename, but as
  a coordinated rename across engine + both template shims, not as part
  of the Phase-1 cascade fix.

**Separate issue surfaced by Phase 1a:** the cascade fight on
`.tfr-template a { color: inherit }` (today's CTA bug root cause) is
**NOT solved by tokens alone.** Even with `color: var(--lush-cta-fg)`,
the `.tfr-template a` rule (specificity 0,1,1) still beats `.brk-booking-
account-followup-cta` (specificity 0,1,0). The engine needs higher-
specificity selectors so it wins the cascade against template-level `a`
rules without `!important`. Cleanest fix: namespace under `.brk-booking-
root` (the wrapper class introduced in Phase 4) and write selectors as
`.brk-booking-root .X { ... }` — specificity 0,2,0 universally beats
single-class template selectors. Move this to Phase 4.

So Phase 1 ships the tokens; Phase 4 ships the specificity bump. Both
contribute to "templates never need `!important` to restyle the booking."

**Risk inventory:**
- Phase 1 is the only phase where Lush's own rendering could regress.
  Mitigation: `, <default>` on every `var()` call means even if a token is
  never set, Lush keeps its existing value. Verify on staging URL before
  shipping each batch.
- Phase 4 (rename) is purely mechanical but big-blast-radius. Mitigation:
  one PR per renamed file with imports updated atomically, run the Next
  build between each commit.
- Phase 6 (tests) blocks on staging infrastructure that doesn't exist yet.
  We can still write the tests against a local dev API + tenant; CI
  integration waits for staging.

**Decisions deferred:**
- Whether to migrate `lushBookingCss.ts` to Tailwind utility classes vs
  keep the template-string CSS. Keep the template string for now — Tailwind
  in a string-injected `<style>` block doesn't tree-shake usefully and the
  current pattern works.
- Whether to support tenant-defined custom themes (versus the current
  template-defined themes). Out of scope for this refactor; revisit
  post-launch.
