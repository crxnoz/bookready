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

Rules: never `window.confirm/alert` (use `useConfirm`/`useToast`). Never a hand-rolled status pill (use `StatusBadge` + add to the registry). Never a second "tag" component named `StatusBadge` (the WebsiteHub generic chip is named `Chip`).

---

## 6. Status registry — `web/lib/status.ts`

`statusDef(domain, value) → { label, tone }`; `<StatusBadge>` maps tone→tokens. Tones: `neutral | info | success | warning | danger | accent`. Domains: `appointment · payment · payout · connect · entity · waitlist · request · customer`. **Add new statuses here** (with a best-fit tone) — never invent colors at the call site. `PaymentPill` (AppointmentPaymentStatus) delegates here so payment badges read identically across Appointments / Payments / Dashboard.

---

## 7. Section & page structure

**Shell.** Every editor page is wrapped by `EditorShell` → `SectionTopBar` → `EditorInnerNav` → `EditorPageHeader` → content. Nav lives in **`web/lib/editorNav.ts`** (single source for sections + sub-tabs) — edit there, not the components. Hubs are one page with `?tab=` query sub-tabs (Website/Settings/Payments/Availability), not nested routes.

**Availability-style section language** — `web/components/editor/AvailabilitySections.tsx` (the look the owner blessed; reuse for new full-width, sectioned surfaces):
- `<TabShell>` — full-width `pb-8` container (no `max-w` cap → content fills width).
- `<TabIntro>one line</TabIntro>` — description band under the page header.
- `<CollapsibleSection icon title subtitle open onToggle>` — accordion section; **icon in the cream box**, chevron, collapsed-only subtitle. Manage `open` with a `useState<'a'|'b'|null>` accordion (first open).
- `<Section icon title subtitle action?>` — same chrome, non-collapsible (e.g. the calendar grid).
- `<SectionHeader>` / `<IconBox>` — the inline icon-box heading + the cream square itself.

**The icon-box** (BookReady signature): `w-7 h-7` (sm) / `w-8 h-8` (md) `bg-cream border border-hairline-soft flex items-center justify-center` wrapping a `text-muted-text` lucide icon (size 13/15). In Settings, `SectionTitle` renders it. *(Open question being designed: the exact site-wide scope of where the box applies vs. inline glyphs — see the icon-rule discussion.)*

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
2. Page wrapped in `EditorShell`; full-width via `TabShell`; `TabIntro` one-liner.
3. Group content in `CollapsibleSection`/`Section` with icon-boxes; cards `bg-white border-hairline-soft`.
4. Eyebrow labels (`text-eyebrow tracking-eyebrow uppercase`), inputs from `ui/`, status via `StatusBadge` + registry.
5. `useConfirm`/`useToast` for confirms/feedback; `AsyncBoundary` for load/error/empty.
6. Spacing from §4; sharp everywhere; tokens only.
7. `check:ui` + `build` green → commit (explicit list) → deploy on ask.

---

*As-built reference. Live across the tenant editor as of the cohesion v1–v3 + Availability 2.0 + Settings-IA work. Sharp, tokenized, flat, editorial.*
