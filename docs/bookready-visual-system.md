# BookReady Visual System v1

> The **token + component visual layer** that sits inside `bookready-ui-architecture-v1.md`. The architecture doc says *what goes where and how it behaves*; this doc says *what it looks like at the token level* — color, shape, type, elevation, density, and the visual contract of each shared component.
>
> Third doc in the set: `tenant-architecture-bible.md` (as-built inventory) · `bookready-ui-architecture-v1.md` (structural rules) · **this** (visual tokens).
>
> **Two hard rulings (owner-set):**
> 1. **SHARP. EVERYWHERE.** Border-radius is `0` on every surface, control, chip, avatar, toggle, and overlay. No soft cards, no pills. This is non-negotiable and the single biggest correction from today's drifted state.
> 2. **Gradients are reserved.** Gradients are permitted **only** on (a) Coming-Soon surfaces and (b) explicitly-designated "marquee" feature moments (a genuinely big/insane feature reveal). They are a *moment*, never a surface treatment — banned on buttons, inputs, cards-as-chrome, nav, tables, badges, and anything functional.
>
> Everything below is grounded in values already in the codebase; this is **consolidation**, not invention. Where a value is newly derived it is marked *(derived)*.

---

## 0. Visual principles

1. **Sharp is the brand.** Rectangles, hairlines, hard edges. Editorial, structured, premium. Radius `0`.
2. **Tokens, not hexes.** Every color, border, and size is a named token. Inline hexes and one-off opacities are defects. (Today: 6 tokens vs ~55 inline hexes vs 10+ border opacities.)
3. **Flat, with hairlines.** Depth comes from thin borders and the cream/white contrast — not shadows. Shadow is reserved for overlays only.
4. **One token per meaning.** One green for success, one red for danger, one amber for warning — each with exactly one tint + one foreground. No "4 greens."
5. **Restraint is luxury.** Compact density, limited weights, generous negative space over decoration. Gradients are a rare exclamation point, not wallpaper.

---

## 1. Color tokens

### 1.1 Surfaces
| Token | Value | Use |
|---|---|---|
| `bg` | `#F8F6F2` (cream) | app/page background |
| `surface` | `#FFFFFF` | cards, inputs, modals, drawers, sheets |
| `surface-sunken` | `#F8F6F2` (cream) | inset/nested fields, table headers, well backgrounds |
| `scrim` | `rgba(18,18,18,0.40)` | modal/drawer backdrop |

### 1.2 Ink (text + foreground)
| Token | Value | Use |
|---|---|---|
| `ink` | `#121212` (near-black) | primary text, primary fills, active nav |
| `ink-muted` | `#6B7280` | secondary text, eyebrows, hints |
| `ink-faint` | `#B0A99F` *(derived from placeholder)* | placeholders, disabled text |
| `on-ink` | `#FFFFFF` | text/icons on a near-black fill |

### 1.3 Borders — **3 steps only** (replaces the 10+ opacities in use today)
| Token | Value | Use | Maps from today |
|---|---|---|---|
| `border-subtle` | `rgba(18,18,18,0.08)` | dividers, internal row lines | 0.05 / 0.06 / 0.08 / 0.10 |
| `border` | `rgba(18,18,18,0.12)` | default card/section hairline (already the official token) | 0.12 |
| `border-strong` | `rgba(18,18,18,0.20)` | inputs, emphasis, focus-adjacent edges | 0.15 / 0.18 / 0.20 / 0.25 |
> All borders are **1px solid**. No blurred/elevated/glow borders. Inactive-nav text uses `ink` at 70% — that's a *text* color, not a border; keep as `ink-muted` going forward.

### 1.4 Brand accents (decorative fills + selected/tinted states)
| Token | Value | Use |
|---|---|---|
| `accent-blush` | `#E8C7DA` | warm chips, "new"/highlight, selected-warm |
| `accent-lavender` | `#E8E4FF` | cool chips, "confirmed"/"account"/info, selected-cool |
> Near-black (`ink`) is the **primary action** color. Blush/lavender are supporting accents, never the primary button.

### 1.5 Status families — **one foreground + one tint each** (kills the 5-palette sprawl)
| Family | `*-fg` (text / icon / border) | `*-bg` (tint surface) | Meaning |
|---|---|---|---|
| `success` | `#0F6F3D` | `#EAF3EE` *(derived)* | paid, confirmed, connected, healthy |
| `warning` | `#8A5A00` (text) · `#C98A14` (icon) | `#FFF8E6` | pending, attention, nearly-full |
| `danger` | `#B42828` | `#FBEAEA` *(derived ≈ red-50)* | failed, cancelled, disputed, destructive |
| `info` | `#121212` on lavender | `#E8E4FF` (lavender) | neutral notices (no new blue introduced) |
| `neutral` | `#6B7280` | `#F8F6F2` (cream) | default/closed/inactive |
> **Retire:** `#1e7a3f`, `#7a5c00`, `text-green-600/700`, `text-red-500/600/700`, `bg-red-50`, `border-red-200/400`, `#b91c1c` → all map into the four families above. One status enum → one token (see the status registry in the architecture doc).

### 1.6 Gradients — **reserved tokens** (per owner ruling)
| Token | Value | Allowed on |
|---|---|---|
| `gradient-soon` | blush-tint → white → lavender-tint (`#FFE5F0 → #FFFFFF → #F0E5FF`) | Coming-Soon hero panels only |
| `gradient-marquee` | `accent-blush → accent-lavender` (diagonal) | a designated big/"insane" feature reveal moment only |
> **Rules:** gradients appear on **at most one element per screen**, only on Coming-Soon or marquee surfaces. **Never** on buttons, inputs, cards used as chrome, nav, tables, badges, or any everyday functional surface. A gradient signals "this is special/upcoming," nothing else. Everything else stays flat cream/white.

**Total token count: ~22 colors** (4 surface + 4 ink + 3 border + 2 accent + ~5×2 status + 2 gradient) vs ~55 inline hexes today.

---

### 1.7 Domain palettes (the one hex exemption)
A few surfaces encode **meaning** in color and are exempt from the "no inline hex" rule — treat them like a chart's series colors:
- **Smart Calendar legend** — mauve = date override, red tint = closed, gold = nearly-full, green = has-space, diagonal gold hatch = un-released. These are a documented legend; keep them (as scoped rgba in that one file), not folded to generic tokens.
- **Charts/sparklines** (dashboard) — SVG `fill`/`stroke` need raw color values; `currentColor` + token vars where possible, else accepted.

Everything *else* (chrome, status, borders, text) must be tokens. The guardrail only flags **className** hex (`text-[#…]`), so legitimate SVG/inline domain colors don't trip it.

## 2. Shape — the SHARP ruling

- **`--radius: 0`. Border-radius is zero on everything.** Cards, buttons, inputs, selects, textareas, chips/badges, modals, drawers, bottom-sheets, banners, toasts, avatars, image thumbnails, toggles, checkboxes, radios, calendar cells, tooltips.
- **No `rounded-*` Tailwind utilities are permitted** in tenant code. The 23 `rounded-full` (pills) and 37 `rounded-2xl/xl/lg` (soft cards) are all removed → sharp.
- **The only two geometric exceptions** (not "corners," so not in scope): the loading **spinner** (a circle by nature) and the **scrollbar thumb** (cosmetic, `border-radius:3px` in globals — may stay or go to 0; invisible either way).
- **Notable consequences (intentional, flagged so there are no surprises):**
  - **Avatars are square.** Staff/customer photos render as sharp squares, not circles. This is deliberately editorial and on-brand.
  - **Toggles are a sharp knob in a sharp track.** Checkboxes are sharp squares. **Radios are sharp squares too** (a filled square = selected); we accept the small affordance trade for strict consistency.
  - **Bottom-sheets on mobile have square top corners** (no rounded sheet lip).

> Rationale: the stated language is "minimal border radius / no rounded-pill-heavy." "Minimal" in practice has been ambiguous and drifted to soft. Setting it to **absolute zero** removes the ambiguity forever and is what makes the product read as one sharp, premium, editorial system.

---

## 3. Elevation

- **Flat by default.** Surfaces are distinguished by the cream-bg / white-surface contrast + `border`. No card shadows.
- **Shadow is overlay-only:** modals and drawers use a single elevation (today's `shadow-xl`) over the `scrim`. Define one token `elevation-overlay` and use it nowhere else.
- **No glassmorphism.** Remove the stray `backdrop-blur` usages; overlays use the flat `scrim` only.

---

## 4. Typography & hierarchy

**Family:** Inter, single family (`--font-inter`). No second face.

### 4.1 Type scale (named tokens — no arbitrary `text-[Npx]`)
| Token | Size | Use |
|---|---|---|
| `text-eyebrow` | 10px · bold · UPPERCASE · tracking `0.14em` (baked in) · `muted-text` | section names, card/stat labels — **the BookReady signature** |
| `text-2xs` | 11px | status badges, dense meta, chips |
| `text-xs` | 12px | small body, table cells |
| `text-sm` | 14px | body, form controls, most UI text |
| `text-base` | 16px | emphasis body, mobile inputs |
| `text-lg` | 18px | minor headings |
| `text-xl` | 20px | page/section titles |
| `text-2xl` | 24px | page hero titles |
| `text-3xl` | 30px | rare dashboard hero numbers (fold 28/32/36/44 here) |
> Dense editorial UI genuinely needs 10–11px, so those are **named tokens** (`text-eyebrow`, `text-2xs`), not arbitrary px. **Fold:** `8/9px → eyebrow(10)`; `13px → sm(14)`; display `22–44px → 2xl/3xl`. The win is banning the **arbitrary bracket syntax** (`text-[11px]` ×297 etc.) in favor of these names — not collapsing 10 and 11 into one.

### 4.2 Weights — three only
`medium (500)` · `semibold (600)` · `bold (700)`. (No light/regular for UI chrome.)

### 4.3 Tracking
- Eyebrows: wide (`0.14–0.18em`).
- Titles: tight (`tracking-tight`, or `tightest` -0.04em for hero).
- Body: normal.

### 4.4 The hierarchy stack (every screen header)
```
EYEBROW            10px bold uppercase wide  ink-muted     ("CLIENTS")
Title              text-xl/2xl bold tracking-tight ink     ("Customers")
Subtitle           text-sm ink-muted                       (one line)
```

### 4.5 Mobile rule (keep)
Form controls render at **16px on ≤768px** (the existing `globals.css` rule) to stop iOS auto-zoom. Desktop keeps the compact 14px.

---

## 5. Density & spacing — strict, consistent everywhere

BookReady runs on **two spacing grids**: a **4px grid for layout** and a **2px grid for tight inline chrome**. Nothing outside these sets is permitted (lint-enforced in the sweep). This is the rule that makes padding/margin/gaps consistent across every screen.

### 5.1 Layout grid (4px) — structure
Allowed steps: **2 · 3 · 4 · 5 · 6 · 8 · 10 · 12** → `8 / 12 / 16 / 20 / 24 / 32 / 40 / 48`px.
Use for: page padding, card padding, section rhythm, grid gaps, vertical stacks.

### 5.2 Micro grid (2px) — inline chrome only
Allowed steps: **0.5 · 1 · 1.5 · 2** → `2 / 4 / 6 / 8`px.
Use **only** for: icon↔label gaps, chip/badge internal padding, label↔input gaps. Never for page/card/section layout.

### 5.3 Component spacing standards (use verbatim — this is the "consistent throughout")
| Slot | Value |
|---|---|
| Page content padding | `p-4 sm:p-6` (16→24) |
| Card padding — default | `p-5` (20) |
| Card padding — dense / compact | `p-4` (16) / `p-3` (12) |
| Between cards & page sections | `space-y-5` (20) |
| Between list rows | `space-y-2` (8) |
| Between fields in a form | `space-y-4` (16) |
| Label ↔ input | `gap-1.5` (6, micro) |
| Icon ↔ label (inline) | `gap-2` (8) |
| Toolbar / filter-chip row gap | `gap-2` (8) |
| Stat-strip gap | `gap-3` (12) |
| Card-grid gap | `gap-4` (16) |
| Modal / drawer body padding | `p-5` (20) |

### 5.4 Reality being corrected
Padding currently sprawls across **~20 distinct values** (`px-1…px-6`, `py-0.5…py-12`, `p-1.5…p-8`); gaps across **8** (`gap-0…gap-6`); and type uses raw arbitrary px **847+ times** (`text-[11px]` 297×, `text-[10px]` 250×, `text-[9px]` 85×, `text-[12px]` 72×, `text-[13px]` 50×…). The sweep folds all of it into §5.1–5.3 (spacing) and §4.1 (type).

**Compact by intent:** BookReady is a dense operator tool. Negative space comes from the cream field around white cards — not inflated padding.

---

## 6. Component visual contracts

All sharp (`radius 0`). All consume tokens. Each becomes the single shared primitive (see architecture doc Law 4).

| Component | Visual contract |
|---|---|
| **Button** | `Button.tsx` is the base (already sharp). Variants: `primary` (`ink`/`on-ink`, hover ink-90%), `secondary` (`surface-sunken` + `border-strong`), `ghost` (transparent, hover ink-5%), `destructive` (`danger-fg` fill / `on-ink`). Sizes `sm/md/lg`. `font-semibold tracking-wide`. **Ban hand-rolled buttons** — enforce this primitive. |
| **Input / Textarea / Select** | `surface` bg, `border-strong`, `px-4 py-2.5`, `text-sm`, sharp. Label = `eyebrow`. Focus = `ring-2 ring-ink/10 border-ink/30`. Error = `danger-fg` border + message. **Add a `Select` primitive** (today native/hand-rolled). |
| **StatusBadge** | One component, sharp chip, `text-xs` (or 10px micro), tone from the status registry → `{family}-bg` fill + `{family}-fg` text/border. Label-cased ("Deposit paid", not "deposit_paid"). Replaces all 5 current pill maps. |
| **Card** | `surface` + `border`, **radius 0**, `p-5`. Roles per architecture §3 (Stat/Management/Record/Info/Alert/State). No shadow. |
| **Modal** | Centered desktop / bottom-sheet mobile (**square top**), `surface`, radius 0, `elevation-overlay` over `scrim`. Esc + backdrop close. One primary action. |
| **Drawer** | Right slide-in, `surface`, `border-l`, radius 0, `elevation-overlay`. Lazy-loaded sectioned detail. |
| **Banner / Alert** | One component, 4 tones (`info/success/warning/danger`) → `{family}-bg` + `{family}-fg` icon/text, `border` in the family fg at low opacity. Sharp. Standing states only (transient → Toast). |
| **Toast** (new) | Sharp, `surface` + `border`, status-tinted left edge, bottom-stack. Transient feedback (save success, copy, errors). |
| **EmptyState** | One component: lucide icon + headline (`text-sm` bold) + one-line guidance (`ink-muted`) + optional single sharp CTA. Filter-aware copy. |
| **Toggle** | Sharp track (`border-strong`) + sharp knob; on = `ink` fill. |
| **Tabs / InnerNav** | Underline-active (2px `ink` bottom border, `-mb-px`), inactive `ink-muted`. Already correct — keep, source from config. |
| **Avatar / thumbnail** | **Square**, `border`, object-cover, sharp. |

---

## 7. Iconography

- **lucide-react only. No emojis.** (Remove the stray "✓" glyph in dead `HoursEditor`.)
- Sizes: `12 / 14 / 16 / 18 / 20`. Default stroke `1.8`; active/emphasis `2.2`.
- Icons inherit `currentColor` (token-driven), never hardcoded fills.

---

## 8. What this rips out (compliance targets)

| Drift (today) | Target |
|---|---|
| `rounded-2xl/xl/lg` (37×) + `rounded-full` (23×) | **all removed → radius 0** |
| ~55 inline hex colors | the ~22-token set in §1 |
| 10+ border opacities | `border-subtle / border / border-strong` |
| 4 greens, multi reds/ambers | one token per status family |
| stray `backdrop-blur` (5×) | flat `scrim` only |
| gradients sprinkled (4×) | only `gradient-soon` + `gradient-marquee`, ≤1/screen, on allowed surfaces |
| arbitrary `8/9/11/13px` text (847+×) | the 6-step scale + eyebrow (§4.1) |
| ~28 distinct padding/gap values | the two-grid set (§5.1–5.3) |
| hand-rolled buttons/inputs/pills | the shared primitives in §6 |
| `text-green-600` + "✓" glyph (HoursEditor) | deleted (dead file) |

---

## 9. How visual + architecture lock together

- **Status registry** (architecture §8) supplies the *enum + label*; this doc supplies the *tone tokens*. One source feeds `StatusBadge`.
- **Card roles** (architecture §3) define *purpose + affordances*; this doc defines *radius 0 + tokens + padding*.
- **Save/feedback** (architecture §4–5) define *behavior*; this doc defines *Toast/Banner/Button look*.
- **Coming-Soon** (architecture Law 10) is one component; this doc grants it the **only** standing gradient (`gradient-soon`).

Build order: tokens → primitives → sweep (see the cohesion plan). A screen is "on-system" when it uses zero inline hexes, zero `rounded-*`, only shared primitives, and only registry-driven status tones.

---

*BookReady Visual System v1. Pairs with the Architecture Bible (as-built) and UI Architecture v1 (structure). Sharp, tokenized, flat, editorial — gradients reserved for moments that earn them.*
