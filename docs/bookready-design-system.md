# BookReady Design System — as built (authoritative build reference)

> This is the **single source for building new tenant-editor sections** so they match what's already shipped. It records the *actual* tokens, primitives, and patterns in the codebase after the cohesion + availability + settings work — not a spec/wishlist. When building anything new in `web/`, follow this.
>
> Companion specs (history/rationale): `bookready-visual-system.md` (the v1 ruling), `bookready-ui-architecture-v1.md` (IA), `tenant-architecture-bible.md` (inventory). **This doc wins** for "how do I build it."

---

## 0. The non-negotiables (laws)

1. **SHARP everywhere — `radius 0`.** No `rounded-*` classes anywhere in editor code. Sharp cards, chips, inputs, toggles, avatars, modals. Hard-enforced by `npm run check:ui` (fails on any `rounded-*` in the editor dirs). *(Public templates under `web/templates/*` are intentionally exempt and may be soft.)*
2. **Tokens, never inline hex.** Use the named Tailwind tokens below. No `text-[#…]` / `bg-[#…]` in chrome. (Exemptions: documented domain palettes — calendar legend, chart fills, color-picker swatches, the reserved gradient stops.)
3. **Flat, with hairlines.** Depth = cream-vs-white + a 1px hairline border. Shadow is overlay-only (modals/drawers).
4. **One shared primitive per pattern.** Don't hand-roll a button/badge/toggle/modal — import from `web/components/ui/`. One status vocabulary from `lib/status.ts`.
5. **Gradients are reserved.** Only on Coming-Soon surfaces or a designated "marquee" feature reveal — never on functional chrome. ≤1 per screen.
6. **lucide-react icons only. No emojis.**

A screen is "on-system" when: 0 `rounded-*`, 0 inline hex in chrome, only shared primitives, status tones from the registry, spacing from the two grids.

---

## 1. Color tokens (exact — `web/tailwind.config.ts`)

**Surfaces / ink**
| Token | Hex | Use |
|---|---|---|
| `cream` | `#F8F6F2` | app/page background; sunken/nested fields; icon-box fill |
| `white` (`bg-white`) | `#FFFFFF` | cards, inputs, modals, rows |
| `near-black` | `#121212` | primary text, primary fills, active nav |
| `muted-text` | `#6B7280` | secondary text, eyebrows, hints |
| `faint-text` | `#B0A99F` | placeholders, disabled text |

**Brand accents** (supporting fills/tints — never the primary action)
| Token | Hex | Use |
|---|---|---|
| `blush` | `#E8C7DA` | warm chips, "new" |
| `lavender` | `#E8E4FF` | cool chips, "info/confirmed" |

**Hairlines — the only 3 border colors**
| Token | Value | Use |
|---|---|---|
| `hairline-soft` | `rgba(18,18,18,0.08)` | dividers, internal row lines |
| `hairline` (and legacy `border`) | `rgba(18,18,18,0.12)` | default card/section edge |
| `hairline-strong` | `rgba(18,18,18,0.20)` | inputs, emphasis edges |

**Status families — one fg + one tint each**
| Family | fg token | bg token | Meaning |
|---|---|---|---|
| success | `success` `#0F6F3D` | `success-bg` `#EAF3EE` | paid, confirmed, connected, healthy |
| warning | `warning` `#8A5A00` (icon: `warning-icon` `#C98A14`) | `warning-bg` `#FFF8E6` | pending, attention, nearly-full |
| danger | `danger` `#B42828` | `danger-bg` `#FBEAEA` | failed, cancelled, disputed, destructive |
| info | `near-black` on `lavender` | `lavender` | neutral notices (no new blue) |
| neutral | `muted-text` | `cream` | default/closed/inactive |

- Tinted "danger box" border = `border-danger/30` (Tailwind opacity modifier reproduces the old `rgba(180,40,40,0.30)` exactly). Same trick for any token at partial alpha — never reach for an inline rgba.

**Reserved gradient stops:** `soon-from` `#FFE5F0` → `soon-to` `#F0E5FF` (Coming-Soon only).

**Domain-palette exemption:** the Smart-Calendar legend (mauve override / red closed / gold nearly-full / green has-space / hatch un-released), chart SVG fills, and color-picker swatches keep raw values (scoped to those files). The guardrail only flags **bracketed className hex**, so these don't trip it.

---

## 2. Type tokens & the tailwind-merge gotcha

**Custom sizes** (so dense UI never uses arbitrary `text-[10px]`):
- `text-eyebrow` = 10px (size only) — pair with `tracking-eyebrow` (0.14em) + `uppercase font-bold text-muted-text` for the **BookReady eyebrow** (section/stat labels — the signature).
- `text-2xs` = 11px — badges, dense meta, chips.
- `text-xs/sm/base/lg/xl/2xl/3xl` = Tailwind defaults.
- Weights: `medium / semibold / bold` only.
- `tracking-tightest` (-0.04em) for hero titles.

**⚠️ CRITICAL — `cn()` and custom font sizes.** `cn` (lib/cn.ts) uses `tailwind-merge`, which is taught about our custom font-size tokens via `extendTailwindMerge`:
```ts
extend: { classGroups: { 'font-size': [{ text: ['eyebrow', '2xs'] }], tracking: [{ tracking: ['eyebrow'] }] } }
```
**If you add another custom `text-*` / `tracking-*` token to tailwind.config, you MUST add it here too.** Otherwise tailwind-merge misclassifies it as a text-*color* and silently strips the size when a color token follows in the same `cn()` call — the element loses its font-size and renders huge. (This was a real shipped bug.)

The eyebrow hierarchy on every screen header:
```
EYEBROW         text-eyebrow tracking-eyebrow uppercase font-bold text-muted-text
Title           text-xl/2xl font-bold tracking-tight text-near-black
Subtitle        text-sm text-muted-text
```

---

## 3. Shape & elevation

- `radius 0` everywhere (law 1). Avatars/thumbnails are **square**; toggles are a sharp knob in a sharp track.
- Flat. The only shadow is overlay elevation on `Modal`/`Drawer` (over a `rgba(18,18,18,0.40)` scrim). No `backdrop-blur` on chrome.

---

## 4. Spacing — two grids (keep consistent)

- **Layout (4px grid):** `p-2 p-3 p-4 p-5 p-6 p-8` etc. — page/card/section padding, stacks, grid gaps.
- **Micro (2px):** `gap-0.5 gap-1 gap-1.5 gap-2` — icon↔label, chip padding, label↔input only.

Standards (use verbatim):
| Slot | Value |
|---|---|
| Page content padding | `p-3 sm:p-5 md:p-6` (hubs) |
| Card padding | `p-4` (dense) / `p-5` (default) / `p-3.5` (settings rows) |
| Between cards/sections | `space-y-4` / `space-y-6` |
| List rows | `space-y-2` / `divide-y divide-hairline-soft` |
| Form fields | `space-y-3` |
| Label ↔ input | `gap-1.5` |
| Icon ↔ label | `gap-2` / `gap-3` (section headers) |
| Stat-strip / card grid | `gap-3` |

---

## 5. Shared primitives — `web/components/ui/` (import these, don't rebuild)

| File | What | Notes |
|---|---|---|
| `Button.tsx` | the one button | variants/sizes, sharp, token-driven |
| `Input.tsx` / `Textarea.tsx` / `Select.tsx` | form controls | `bg-white border-hairline-strong px-3 py-2.5 text-sm`, eyebrow label, `placeholder:text-faint-text` |
| `Toggle.tsx` | sharp switch | props `checked` / `onChange(next)` / `disabled` / `label` |
| `StatusBadge.tsx` | the one status chip | `<StatusBadge domain="…" status={value} label?={override} />` → tone/label from `lib/status.ts` |
| `Card.tsx` | sharp card | `bg-white border-hairline-soft` |
| `Banner.tsx` | standing inline alert | 4 tones |
| `Modal.tsx` / `Drawer.tsx` | overlays | only place shadow + scrim are allowed |
| `Toast.tsx` | transient feedback | `useToast()` → `toast.success/error(...)` (provider in `app/(editor)/layout.tsx`) |
| `ConfirmDialog.tsx` | confirm dialog | `const confirm = useConfirm(); const ok = await confirm({ title, message, confirmLabel, tone:'danger' })` — **replaces `window.confirm`** |
| `EmptyState.tsx` | empty/zero states | icon + headline + guidance + optional CTA |
| `AsyncBoundary.tsx` | loading/error/empty wrapper | `<AsyncBoundary loading error onRetry loadingLabel>` |
| `SaveBar.tsx` | sticky save footer (boolean-triad API) | note: some big panels still use bespoke save bars — see §7 |
| `IconBox.tsx` | the cream icon-box (BookReady signature) | `<IconBox icon size? tone? />` — `tone="dark"` for dark cards; re-exported from `AvailabilitySections` |
| `NavCard.tsx` | nav / feature card (icon-box + title + desc + chevron) | `<NavCard icon title description? href?/onClick? status? action? tone? />` — renders Link/button/div, light+dark |

Rules: never `window.confirm/alert` (use `useConfirm`/`useToast`). Never a hand-rolled status pill (use `StatusBadge` + add to the registry). Never a second "tag" component named `StatusBadge` (the WebsiteHub generic chip is named `Chip`).

---

## 6. Status registry — `web/lib/status.ts`

`statusDef(domain, value) → { label, tone }`; `<StatusBadge>` maps tone→tokens. Tones: `neutral | info | success | warning | danger | accent`. Domains: `appointment · payment · payout · connect · entity · waitlist · request · customer`. **Add new statuses here** (with a best-fit tone) — never invent colors at the call site. `PaymentPill` (AppointmentPaymentStatus) delegates here so payment badges read identically across Appointments / Payments / Dashboard.

---

## 7. Section & page structure

**Shell.** Every editor page is wrapped by `EditorShell` → `SectionTopBar` → `EditorInnerNav` → `EditorPageHeader` → content. Nav lives in **`web/lib/editorNav.ts`** (single source for sections + sub-tabs) — edit there, not the components. Hubs are one page with `?tab=` query sub-tabs (Website/Settings/Payments/Availability), not nested routes.

**Availability-style section language** — `web/components/editor/AvailabilitySections.tsx` (the blessed look; reuse for new full-width, sectioned surfaces). **As of the Bookings-cohesion pass these render as cards on a padded canvas:**
- `<TabShell>` — full-width container that owns the **outer padding + gap**: `p-3 sm:p-5 md:p-6 space-y-4`. Its section children are therefore spaced apart and never touch the viewport edges. **Don't add your own `px-*`/`mx-*` to a direct TabShell child** (it double-pads) — put padding inside the card, and let a bare action button (e.g. Save) sit as a plain child.
- `<TabIntro>one line</TabIntro>` — plain muted copy above the cards (no border/band of its own anymore).
- `<Section icon title subtitle action? tone?>` — **a white card** (`bg-white border-hairline-soft`), icon-box header, non-collapsible. `action` = right-aligned header node (e.g. a Save button).
- `<CollapsibleSection icon title subtitle open onToggle tone?>` — same card, accordion. Manage `open` with `useState<'a'|'b'|null>` (first open); collapsed-only subtitle.
- **`tone="dark"`** on either → near-black card (`bg-near-black`, white text, translucent icon-box) for premium emphasis / contrast — used on **After Hours**. Budget ≤1 dark card per screen; reserve for a genuine "premium feature" surface.
- `<SectionHeader icon title subtitle action?>` — the inline icon-box **list anchor** (NOT a card): sits at the top of a list/working area *on the cream canvas*, with the live count in `subtitle` and the primary "Add …" in `action`. This is the **Services / Staff** header pattern.

**In-page secondary nav** — `web/components/editor/SubTabNav.tsx`. Compact (`text-2xs`) underline tab strip for switching sub-views *inside* a page, one level below `EditorInnerNav`. Pass `hrefFor` for URL-driven tabs (Availability `?tab=`) or `onSelect` for local state (Services Categories/Add-ons/Packages). `soon` items get a muted "Soon" badge. The nav hierarchy on a page is therefore:

```
SectionTopBar   (Bookings)            ← section
 EditorInnerNav (Availability…)       ← section sub-tabs (text-2xs, py-3)
  EditorPageHeader (title + subtitle)  ← page identity
   SubTabNav     (Smart Calendar…)    ← in-page sub-views (text-2xs, py-2 — more compact)
    TabShell → cards                   ← content
```

**Non-collapsible tab-view pattern.** When a panel gets its own SubTabNav tab, it should NOT also be collapsible — render it as a plain card with a **static** icon-box header (no chevron, always-open content). Keep collapse only for *grouped items nested inside* a view (e.g. a service row that expands to edit). (Services Categories/Add-ons follow this.)

**The icon-box** (BookReady signature) is the shared `web/components/ui/IconBox.tsx`: `w-7 h-7` (sm) / `w-8 h-8` (md) bordered square. Light = `bg-cream border-hairline-soft` + `text-muted-text` glyph (size 13/15); `tone="dark"` = `bg-white/10 border-white/20` + `text-white/80` glyph. `NavCard`, `SectionHeader`, `Section`, `CollapsibleSection` all consume it so the box is identical everywhere.

---

## 8. Forms & data patterns (tenant-safe)

- **Load/draft/dirty/save**: `data` + `draft` state, `patch(partial)`, `dirty` via `JSON.stringify` compare, `save()` → API → reset. Toast on error/success; sticky `SaveBar` OR an inline save button.
- **Partial-save cards**: a self-contained card that owns one slice of a model and `PATCH`es only its fields (e.g. `PrefsCard` in SettingsHub, `StripeConnectCard`, `CapacityPanel` buffers). Pattern for putting a model's fields under a different tab without entangling that tab's own save. Safe because hub tabs unmount/remount on switch (fresh load each visit).
- **Backend** stays the canonical tenancy pattern: `Tenant::findOrFail` → `tenancy()->initialize` → `DB::table` → flatten to plain array → `tenancy()->end()` → return. Partial `PATCH` controllers (only write provided keys) so two surfaces can own different fields of one table.

---

## 9. Verify before shipping

- `cd web && npm run check:ui` — **hard-fails on any `rounded-*`** in editor scope; warns on inline hex / palette utils (the standing warns are the documented domain-palette exemptions).
- `npm run build` — must compile + type-check + complete SSG. *(On Windows the build worker intermittently dies with `0xC0000409` during "Generating static pages" — flaky, not your code; re-run / `rm -rf .next`. The Linux deploy never hits it.)*
- PHP: `php -l <file>` on changed controllers.
- Deploy is the documented script in `CLAUDE.md` (`set -euo pipefail`, `rm -rf .next`, `DEPLOY_OK` sentinel). Commit/deploy only on explicit ask; stage explicit file lists.

---

## 10. New-section checklist

1. Nav entry in `editorNav.ts` (don't touch the nav components).
2. Page wrapped in `EditorShell`; full-width via `TabShell` (it owns the `p-3 sm:p-5 md:p-6 space-y-4` padding — don't re-pad its direct children); `TabIntro` one-liner. Many sub-views → add a `SubTabNav`.
3. Group content in `Section`/`CollapsibleSection` cards (white, icon-box header); anchor list pages with `SectionHeader` (icon-box + live count + Add `action`); reach for `tone="dark"` only for a single premium card.
4. Eyebrow labels (`text-eyebrow tracking-eyebrow uppercase`), inputs from `ui/`, status via `StatusBadge` + registry.
5. `useConfirm`/`useToast` for confirms/feedback; `AsyncBoundary` for load/error/empty.
6. Spacing from §4; sharp everywhere; tokens only.
7. `check:ui` + `build` green → commit (explicit list) → deploy on ask.

---

*As-built reference. Live across the tenant editor as of the cohesion v1–v3 + Availability 2.0 + Settings-IA + Bookings-cohesion (carded sections / compact `SubTabNav` / shared `IconBox` + `NavCard` / dark `tone`) work. Sharp, tokenized, flat, editorial.*
