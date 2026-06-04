---
name: template-creator
description: Scaffold a new BookReady template end-to-end — manifest.ts, render component (composing the 9 shared sections from @bkrdy/platform/sections, with a token bridge + a thin per-template skin for signatures), booking wrapper, customer-auth re-exports, registry registration, backend TemplateDefaults branch, manifest validation, and `npm run build` verification. Use whenever the user wants to create, scaffold, generate, build, or add a new template to BookReady, even when they don't explicitly say "scaffold" — phrases like "I want a new template called X", "make a template for beach spas", "build a Velvet-style template called Y", "add a luxury barber template", or "design a new template" should all trigger this skill. Always interactive — runs a focused interview to capture brand direction, color palette, fonts, and which manifest fields the template surfaces, then writes a complete working skeleton in one invocation.
---

# BookReady Template Creator

Takes a creator from "I want a template" to "compiled, registered, validated template skeleton" via a guided interview + scaffolding pipeline. The resulting template satisfies the marketplace contract documented in `web/packages/platform/AUTHORING.md`.

## Mental model

Five things happen, in this order:

1. **Interview** — capture brand direction in conversation
2. **Scaffold** — write 5 files under `web/templates/{slug}/`
3. **Register** — append the slug to `web/templates/registry.ts`
4. **Seed defaults** — add a `match` arm to `api/app/Support/TemplateDefaults.php`
5. **Verify** — run `validateManifest()` + `npm run build`, surface any errors

Don't reorder. The interview answers drive everything; you can't scaffold a manifest without knowing the slug and palette. Verification has to be last because it tests the produced output.

### The big shift: compose, don't hand-roll

A new template is mostly **composition**, not bespoke rendering. The platform now ships **9 fully-themed section components** in `@bkrdy/platform/sections` that every template renders via:

`FaqSection · ReviewsSection · ThanksSection · SiteFooter · InstructionsSection (advice + timeline) · GallerySection · BeforeAfterSection · PolicySection`

Each is styled against canonical theme tokens (`--brk-color-*`, `--brk-family-*`). Your template's job is to **bridge** its palette onto those tokens, then add a thin `.{prefix}-template .brk-*` *skin* for its signature flourishes. Of the 12 required sections, only **3 stay bespoke per template:**

- **Header / Hero** — the identity-defining composition (cover, content card, contact/social buttons)
- **About** — bespoke editorial layout (image arrangement + layered title + drop-cap, etc.)
- **The tab shell + announcement bar** — the tab rail's active-state marker is the template's signature

Everything else is `<FaqSection items={…} />`-style composition. Full architecture + similarity matrix: `web/templates/ARCHITECTURE.md`.

## Gotchas that WILL bite you (read before writing any CSS)

These are hard-won from shipping real templates. Every one of them produced either a broken build or a silently-broken page. Internalize them before you start.

1. **Inject `tokensToCss()` or your `--brk-*` vars resolve to empty.** The design tokens (`--brk-space-md`, `--brk-container-narrow`, `--brk-font-h2`, etc.) are NOT global. They only exist where you declare them. Every template's scoped CSS block MUST open with `${tokensToCss()}` inside the root selector — see `web/templates/opaline/OpalineTemplate.tsx` for the canonical pattern:
   ```ts
   import { tokensToCss } from '@bkrdy/platform'
   const X_CSS = `
   .{prefix}-template {
     ${tokensToCss()}
     /* ...the rest... */
   }`
   ```
   If you skip this and then write `padding: var(--brk-space-3xl)`, the value computes to nothing and the padding silently vanishes — no error, no warning, just a page with no spacing. (This bit Lush Studio: every `--brk-*` reference was dead because it never injected the tokens. The fix was either inject `tokensToCss()` or hardcode literal px.) **Rule: if you reference any `--brk-*` var anywhere in the template, inject `tokensToCss()` in the root selector. When in doubt, inject it.**

2. **NEVER put a backtick inside the CSS template literal — not even in a comment.** Your CSS lives in a JS template literal (`` const X_CSS = `...` ``). A stray backtick *anywhere* inside — including inside a `/* comment with `code` */` — terminates the literal early and the build dies with `Expected a semicolon` pointing at a confusing line. Write comments in plain prose or single quotes. Refer to selectors as `.x-template button` (no backticks), not `` `.x-template button` ``.

3. **Unicode escapes need a DOUBLE backslash in template-literal CSS.** `content: "\2726"` (a `✦`) must be written `content: "\\2726"`. JS consumes one backslash when it parses the template literal, so a single backslash either errors or emits the wrong glyph. Always double them: `"\\2726"`, `"\\201C"`, etc.

4. **`overflow-x: hidden` on the template root KILLS `position: sticky`.** If you clip horizontal overflow on `.{prefix}-template` (common, to stop sub-pixel scrollbars), use `overflow-x: clip` instead. `hidden` establishes a scroll container, which makes it — not the viewport — the sticky boundary, so your sticky tab rail never sticks. `clip` does the same visual clipping without the scroll context. (This bit Lush: the tab rail wouldn't stick until we swapped `hidden`→`clip`.)

5. **Universal element resets out-specify your single-class rules.** If you write `.{prefix}-template button { background: none; border: 0 }` (specificity 0,1,1) as a reset, it BEATS `.{prefix}-footer-book { background: gold }` (0,1,0) — your button paints transparent and looks invisible. Scope component rules with the root to win: `.{prefix}-template .{prefix}-footer-book { ... }`. Watch for this on any element that has both a reset and a styled variant (buttons, links).

6. **Don't substring-match booking classes — you'll over-select.** When re-skinning the embedded booking flow, `[class*="brk-booking-service"]` matches the container (`.brk-booking-services`), the card (`.brk-booking-service-card`), AND the inner row (`.brk-booking-service-top`) all at once — so a "card surface" rule leaks onto the bare container and the inner row. Target the specific class you mean (`.brk-booking-service-card`) and leave the others alone.

7. **A mysterious build failure after edits is usually a stale `.next` cache.** `ENOTEMPTY`, `pages-manifest.json not found`, phantom type errors on unchanged files → `rm -rf .next` and rebuild. On Windows the dev server can also hold a lock; the rebuild clears it.

8. **Bridge `--brk-color-*` and `--brk-family-*` or the shared sections render unstyled.** The shared section components (FAQ, Reviews, Footer, etc.) are styled entirely against canonical theme tokens (`--brk-color-bg`, `--brk-color-accent`, `--brk-family-display`, …). They are NOT defined by `tokensToCss()` (that emits only spacing/sizes/motion). You must alias them onto your template's own palette inside the root selector — same place you'd put `tokensToCss()`:
   ```ts
   .{prefix}-template {
     ${tokensToCss()}
     --{prefix}-bg: #...; --{prefix}-text: #...; --{prefix}-accent: #...; /* your vars */

     /* Bridge — the shared sections need these to render in your colors/fonts */
     --brk-color-bg:        var(--{prefix}-bg);
     --brk-color-surface:   var(--{prefix}-card);   /* often same as bg */
     --brk-color-text:      var(--{prefix}-text);
     --brk-color-muted:     var(--{prefix}-muted);
     --brk-color-rule:      var(--{prefix}-rule);
     --brk-color-accent:    var(--{prefix}-accent);
     --brk-color-on-accent: var(--{prefix}-on-accent);  /* readable on accent fill */
     --brk-family-display:  var(--{prefix}-display);
     --brk-family-body:     var(--{prefix}-body);
     /* --brk-family-script: optional, only if you use one */
   }
   ```
   Skip this and FAQ accordions, review cards, the footer, etc. render in a default white/serif look that won't match your brand. (See ARCHITECTURE.md §3 for the full canonical token contract.)

## Step 1: Interview

This is a friendly design conversation, not a form. Ask one or two questions at a time, confirm answers, then move on. Default to sensible answers and only press when the creator's choice would produce a worse result.

**Required to scaffold:**

- **Template name + slug.** Brand name first; derive slug as kebab-case ASCII (e.g., "Sun & Salt" → `sun-salt`). The slug pattern is `^[a-z][a-z0-9-]{1,40}$` — must start with a letter, no special characters, no leading digits. Confirm the derived slug with the creator; some prefer a different shortening. Also check `web/templates/` to make sure the slug isn't already taken.

- **Vibe in one sentence.** "Luxury editorial", "soft feminine spa", "punk fast-casual barbershop", "playful kids' salon". This shapes the seed copy you'll write in step 4 (announcement text, about body, advice/timeline items, footer subtext) and the CSS aesthetic in the rendered component.

- **Color role.** Accent (palette swatches are highlights — page background stays constant) or background (palette swatches replace the page background — accent stays constant, like Velvet Theory's gold). If the creator is unsure, default to `accent` — it's what most templates want and matches the editor's most common UI.

- **Color palette.** Ask for 3-6 `{ hex, label }` pairs. The first is the default. Validate each hex matches `^#[0-9A-Fa-f]{6}$`. If the creator describes colors verbally ("cream + ocean blue + sun yellow"), pick concrete hex values and confirm them.

- **Font direction.** Single sans, single serif, sans + serif pair, hand-script accent? Pick concrete Google Fonts unless the creator names specific ones. Common pairings: Fraunces (serif) + Inter (sans), DM Serif Text + DM Sans, Cookie + Roboto.

- **Header fields to surface.** Default to all five: `cover_image`, `avatar_image`, `announcement`, `business_type`, `social_buttons`. Ask only if the creator's vibe suggests dropping some (e.g., "Lush hides the avatar slot because the design vocabulary is hair-on-cream — no logo block"). Same goes for footer: default to all six, ask only about explicit opt-outs.

**Skip if the creator doesn't care.** Booking flow always wraps `PlatformBookingFlow`. Customer auth always re-exports the shared widget. Don't force decisions that have one right answer.

When the interview is complete, briefly summarize the decisions back to the creator and confirm before writing files.

## Step 2: Scaffold the files

Write five files under `web/templates/{slug}/`. Use these conventions throughout:

- `{slug}` — kebab-case slug (e.g., `sun-salt`)
- `{Pascal}` — PascalCase (e.g., `SunSalt`)
- `{camel}` — camelCase (e.g., `sunSalt`)
- `{prefix}` — slug minus hyphens, used as CSS class prefix (e.g., `sunsalt-`)

### 2a. `manifest.ts`

```ts
import type { TemplateManifest } from '@bkrdy/platform'

/**
 * {Name} — {one-sentence vibe summary from interview}.
 */
const manifest: TemplateManifest = {
  slug:    '{slug}',
  name:    '{Name}',
  version: '0.1.0',

  color_role: '{accent|background}',
  color_palette: [
    { hex: '{hex_1}', label: '{Label 1} (default)' },
    { hex: '{hex_2}', label: '{Label 2}' },
    // ...remaining...
  ],

  header_fields: [/* tokens from interview */],
  footer_fields: [/* tokens from interview */],
}

export default manifest
```

### 2b. `{Pascal}Template.tsx`

The best structural reference is **`web/templates/opaline/OpalineTemplate.tsx`** — it's the closest-to-the-shared-base migrated template (Opaline's CSS was the source the shared `SECTIONS_CSS` was ported from, so it needs almost no skin). For a more heavily-skinned reference (neon over dark canvas), read `web/templates/thefaderoom/TheFadeRoomTemplate.tsx`. (`_example-blank` predates the shared-sections system — do NOT use it as the reference; copy from Opaline instead.)

**Wire-up in 4 moves:**

1. **Import shared sections + canonical CSS:**
   ```tsx
   import { tokensToCss } from '@bkrdy/platform'
   import {
     FaqSection, ReviewsSection, ThanksSection, SiteFooter,
     InstructionsSection, GallerySection, BeforeAfterSection, PolicySection,
     SECTIONS_CSS,
   } from '@bkrdy/platform/sections'
   ```

2. **Inject both CSS strings, in order**, inside the render root:
   ```tsx
   <style>{ {Pascal}_CSS }</style>
   <style>{SECTIONS_CSS}</style>
   <div className="{prefix}-template" /* + accent style vars */ >
     {/* ...sections... */}
   </div>
   ```

3. **Define palette + bridge tokens** in `{Pascal}_CSS`'s root selector (see Gotcha #8 above for the full bridge block).

4. **Compose the 9 shared sections, write the 3 bespoke ones, add a thin skin.**

#### The 12 required sections — what's shared vs. bespoke

| # | Section | Source | Notes |
|---|---|---|---|
| 1 | Announcement bar | **Bespoke** | Static centered strip; you write `~10` lines of JSX + CSS |
| 2 | Header / Hero | **Bespoke** | Identity-defining; you own the layout & contact-button rendering |
| 3 | Booking | Wrap via `{Pascal}Booking.tsx` (step 2c) | |
| 4 | Gallery | `<GallerySection items={site.gallery} groups={site.gallery_groups} … variant="grid"\|"strips" />` | |
| 5 | Results / Before & After | `<BeforeAfterSection items={site.results ?? site.before_after} groups={…} separator?="✦" labels />` | |
| 6 | About | **Bespoke** | Each template arranges `about.images[3]` + heading + body + highlights + signature differently |
| 7 | Policies | `<PolicySection rows={…} customGroups={…} marker="none"\|"glyph"\|"numeral" />` | |
| 8 | Advice | `<InstructionsSection items={settings.advice?.items} cardKicker={settings.advice?.card_kicker} markGlyph="◆" />` | |
| 9 | Timeline | `<InstructionsSection items={settings.timeline?.items} numbered />` | |
| 10 | FAQ | `<FaqSection items={settings.additionals?.faq?.items} heading={…} />` | |
| 11 | Reviews | `<ReviewsSection items={settings.additionals?.reviews?.items} starGlyph="★" />` | |
| 12 | Thank-you + Footer | `<ThanksSection title={…} body={…} signature={…} fallbackSignature={display} />` + `<SiteFooter businessName={…} hours={hours} phone={…} email={…} servicesCount={services.length} onBook={goBook} … />` | |

Each shared component returns `null` when the underlying data is empty (or shows an `emptyText` placeholder if you pass one) — so you can render them unconditionally inside the right tab panel without empty-state guards. Pass `eyebrow={tabLabel.gallery}` etc. so the section's eyebrow tracks the editable tab name.

#### The skin layer

After `<style>{SECTIONS_CSS}</style>` your template's own CSS owns the cascade. Add `.{prefix}-template .brk-*` overrides to reproduce your signature flourishes over the shared base. Examples from the shipped templates:
- TFR: tilted polaroid review cards (`.tfr-template .brk-review { transform: rotate(-1.2deg); … }`), neon-rule gallery tiles
- Lush: gallery polaroids with `nth-child` tilt + Cookie-script group headings; ✦-separated diptych
- Velvet: roman-numeral policy markers via CSS counter (`counter-increment: vt-manifesto`)

How much skin you need is proportional to how distinctive the template is. Opaline = `~0` lines (it IS the base). TFR/Lush = 200–250 lines. The skin can live inline in `{Pascal}_CSS` (preferred for new templates) or as a separate constant string injected with its own `<style>`.

Every section must render — but empty data is already handled by the shared components.

#### What separates a *finished* template from a merely valid one

A template that compiles isn't done. The five shipped templates (The Fade Room, Blackline, Velvet Theory, Lush Studio, Opaline) all run on the same shared-sections skeleton — the per-template work is now concentrated in the **3 bespoke pieces** + the **active-tab marker** + the **skin**. Reviewers and creators expect these:

- **The section header pattern is already shared.** `.brk-section > .brk-section-head (p.brk-eyebrow + h2.brk-section-title)` ships in `SECTIONS_CSS`. You don't build your own — instead, your skin restyles `.brk-section-title` to your display font + signature treatment (e.g., TFR's neon shadow, Velvet's italic Fraunces). Pass `eyebrow={tabLabel[tabId]}` on each shared component so renames in the editor propagate.

- **Sticky tab rail with a *distinct* active marker.** The rail is structurally identical across templates (sticky, top+bottom hairline, container-width slider, horizontal scroll on overflow, uppercase micro labels) — this part you DO write yourself, since the tab shell isn't shared. What MUST differ per template is the active-state marker — it's the template's signature. The shipped five each picked a different one so they don't look like dupes:
  - The Fade Room → a glowing "marquee" bar under the active pill
  - Blackline → a flat accent underline
  - Velvet Theory → a thin gold bar flush with the rail border (serif labels)
  - Lush Studio → a small sparkle floating above the active pill
  - Opaline → soft champagne-wash pill fill
  Invent your own; don't reuse one of these verbatim.

- **3-band footer comes free via `<SiteFooter>`.** Don't hand-write it. CTA / 3-col content / credit bands are all rendered by the shared component; you only pass props (`onBook`, `hours`, `phone`, `email`, `show={…}`, etc.) and optionally skin `.brk-footer-book` (the CTA pill) + `.brk-footer-credit-band` to match your brand. To suppress the "© {year} {name}" prefix and show only "Powered by BookReady", omit `copyrightName` + `year`.

- **Booking lives inside a section wrapper with matching padding.** Don't drop `<{Pascal}Booking>` flush against the tab rail. Wrap it: `<div className="{prefix}-section {prefix}-book">`. Give `.{prefix}-book` the same outer padding your other sections get (plus a little extra on top — the platform booking has no top padding of its own). The platform booking also hard-codes an `<h2>` ("Reserve Your Appointment") inside `.brk-booking-head`; you can't change that markup but you own the cascade — restyle it to your display font, or `display:none` it and let the section header carry the title.

- **Announcement bar: static, not a marquee.** A centered single-line strip with small ornament bookends reads more premium and is consistent with the family. (Lush originally had a scrolling marquee and it was the odd one out.) You still write this yourself — it's not a shared section.

- **Respect `prefers-reduced-motion`.** Gate every transform/animation behind `@media (prefers-reduced-motion: reduce) { ...: none }`. (The shared `SECTIONS_CSS` already does this for its own transitions; this rule is for your skin.)

- **Auto-contrast on accent fills.** If a button fills with the accent color and the owner can swap the accent, the on-accent text can become unreadable. Compute a readable foreground from the accent's luminance (see Lush's `pickOnAccentColor` helper) rather than hardcoding white — then feed that into `--brk-color-on-accent` so the shared CTAs (footer book, thank-you signature glyph) read correctly too.

### 2c. `{Pascal}Booking.tsx`

```tsx
'use client'

import {
  PlatformBookingFlow,
  CustomerAuthProvider,
  PLATFORM_BOOKING_CSS,
} from '@bkrdy/platform/booking'
import type {
  AvailabilityData, BookingQuestion, PublicPaymentSettings,
  PublicStaffMember, Service, ServiceAddon, ServiceCategory,
} from '@/lib/types'

interface Props {
  slug:                     string
  services:                 Service[]
  displayName:              string
  availability:             AvailabilityData | null
  paymentSettings:          PublicPaymentSettings | null
  requirePolicyAgreement:   boolean
  serviceAddons:            ServiceAddon[]
  staffMembers:             PublicStaffMember[]
  serviceCategories:        ServiceCategory[]
  bookingQuestions:         BookingQuestion[]
}

export default function {Pascal}Booking(props: Props) {
  return (
    <CustomerAuthProvider>
      <style>{PLATFORM_BOOKING_CSS}</style>
      <style>{ {Pascal}_BOOKING_FRAME_CSS }</style>
      {/* .lush-template scopes the platform's shared booking CSS (M2c.2 will
          drop it). .{prefix}-booking-inner is your own handle for the variable
          re-skin below. */}
      <div className="{prefix}-booking-frame">
        <div className="lush-template {prefix}-booking-inner">
          <PlatformBookingFlow {...props} />
        </div>
      </div>
    </CustomerAuthProvider>
  )
}
```

The booking flow ships styled in the shared "Lush" variables. You re-skin it by overriding those `--lush-*` variables on `.{prefix}-booking-inner` to your brand tokens. This is the canonical, complete list — set ALL of them or the booking will read half-Lush:

```ts
const {Pascal}_BOOKING_FRAME_CSS = `
.{prefix}-booking-frame {
  width: 100%;
  /* Match your section rhythm — the platform booking has no top padding. */
  padding: var(--brk-space-md) 0 var(--brk-space-2xl);
}
.{prefix}-booking-inner {
  --lush-bg:          transparent;            /* inherit page bg */
  --lush-card:        {subtle surface tint};
  --lush-text:        {ink};
  --lush-muted:       {muted};
  --lush-pink:        {accent hex};           /* the accent — drives CTAs, active states, step pills */
  --lush-pink-rgb:    {accent R, G, B};       /* same color as a comma triplet for rgba() glows */
  --lush-on-pink:     {readable text ON the accent fill};
  --lush-pink-soft:   {accent at ~20% alpha};
  --lush-dark-border: {hairline rule};
  --lush-serif:       {your display serif stack};
  --lush-sans:        {your body sans stack};
  --lush-ui:          {your body sans stack};
  background: transparent;
}
/* Restyle the platform's hard-coded "Reserve Your Appointment" h2: */
.{prefix}-booking-inner.lush-template .brk-booking-head h2 {
  font-family: {your display font} !important;
  /* ...your title treatment... */
}
`
```

Read `web/templates/velvettheory/VelvetTheoryBooking.tsx` for the full reference — it also shows three things you'll likely need:
- **Differentiate booking step states.** Lush fills both `.is-active` AND `.is-done` step pills with `--lush-pink`; once you re-skin that to one accent, completed steps look identical to the current one. Give only `.is-active` a filled pill; outline `.is-done`.
- **Don't substring-match service classes** (gotcha #6 above) — target `.brk-booking-service-card` specifically, not `[class*="brk-booking-service"]`.
- **Force readable text on the account-CTA tile**, which keeps a light surface even on a dark page.

### 2d. `{Pascal}CustomerAuth.tsx`

```ts
'use client'

/**
 * {Pascal}CustomerAuth — re-export of the shared customer auth hook.
 * When this template grows its own auth UX, fork these re-exports into
 * real components.
 */
export {
  useCustomerAuth      as use{Pascal}CustomerAuth,
  useOpenCustomerAuth  as useOpen{Pascal}Auth,
} from '@bkrdy/platform/booking'
```

### 2e. `{Pascal}CustomerAccountWidget.tsx`

```ts
'use client'

export { CustomerAccountWidget as default } from '@bkrdy/platform/booking'
```

## Step 3: Register in the registry

Update `web/templates/registry.ts`. Add the slug to both `REGISTRY` and `MANIFESTS` maps. The pattern (copy verbatim):

```ts
const REGISTRY: Record<string, TemplateLoader> = {
  thefaderoom:  () => import('./thefaderoom/TheFadeRoomTemplate'),
  lushstudio:   () => import('./lushstudio/LushStudioTemplate'),
  velvettheory: () => import('./velvettheory/VelvetTheoryTemplate'),
  blackline:    () => import('./blackline/BlacklineTemplate'),
  opaline:      () => import('./opaline/OpalineTemplate'),
  {slug}:       () => import('./{slug}/{Pascal}Template'),
}

const MANIFESTS: Record<string, ManifestLoader> = {
  thefaderoom:  () => import('./thefaderoom/manifest'),
  lushstudio:   () => import('./lushstudio/manifest'),
  velvettheory: () => import('./velvettheory/manifest'),
  blackline:    () => import('./blackline/manifest'),
  opaline:      () => import('./opaline/manifest'),
  {slug}:       () => import('./{slug}/manifest'),
}
```

## Step 4: Add backend TemplateDefaults branch

Update `api/app/Support/TemplateDefaults.php`. Two `match` blocks need a new arm:

```php
public static function settingsFor(string $templateSlug): array {
    return match ($templateSlug) {
        'thefaderoom'  => self::theFadeRoomSettings(),
        'lushstudio'   => self::lushStudioSettings(),
        'velvettheory' => self::velvetTheorySettings(),
        'blackline'    => self::blacklineSettings(),
        'opaline'      => self::opalineSettings(),
        '{slug}'       => self::{camel}Settings(),  // NEW
        default        => self::theFadeRoomSettings(),
    };
}
public static function sectionsFor(string $templateSlug): array {
    return match ($templateSlug) {
        'thefaderoom'  => self::theFadeRoomSections(),
        'lushstudio'   => self::lushStudioSections(),
        'velvettheory' => self::velvetTheorySections(),
        'blackline'    => self::blacklineSections(),
        'opaline'      => self::opalineSections(),
        '{slug}'       => self::{camel}Sections(),  // NEW
        default        => self::theFadeRoomSections(),
    };
}

**Also add the new slug to `TemplateDefaults::KNOWN_SLUGS`** (top of file) — the sign-up template-slug whitelist reads from it.
```

Then implement `{camel}Settings()` and `{camel}Sections()`. Use `lushStudioSettings()` and `velvetTheorySettings()` as structural references — both call `self::theFadeRoomSettings()` as the base then override `header.announcement_text`, `tabs.*_label`, `about` (heading + eyebrow + body + highlights), `advice` (heading + items), `timeline` (heading + items), and `footer.subtext` with template-flavored seed copy.

For `{camel}Sections()`: templates render their tab rail in `website_sections.sort_order`, so this method must encode YOUR template's designed tab order. The default (TFR's) order is Gallery=3, Results=4, About=5, Policy=6, Advice=7, Timeline=8. If your template's design wants a different order (e.g., About before Results), copy `theFadeRoomSections()` and override the `sort_order` per `section_key` — see `lushStudioSections()` / `velvetTheorySections()` for the pattern. Existing tenants get re-synced to your designed order via the next `tenants:migrate` (the `resync_website_section_sort_order` migration runs against each tenant's active template).

Write copy that matches the vibe from interview question 2. Spartan for "minimalist", warm for "feminine spa", clipped editorial for "luxury". Don't reuse TFR's barbershop copy — that's the whole point of per-template defaults.

## Step 5: Verify

Two checks. Both must pass before reporting success.

### 5a. Validate the manifest

Read the freshly written `web/templates/{slug}/manifest.ts` and validate against `web/packages/platform/src/validateManifest.ts`. The simplest path: write a tiny Node snippet that imports both and runs `validateManifest()` on the new manifest. If it returns a non-empty array, format each error as `{path}: {message}` and stop — the manifest is wrong; fix it before continuing.

Common failure modes:
- Hex missing the leading `#`
- Slug starts with a digit or has uppercase letters
- Palette has fewer than 2 entries
- A field token is misspelled (e.g., `cover_url` instead of `cover_image`)

### 5b. Build

Run `npm run build` from `web/`. Capture output via Bash:

```bash
cd web && npm run build 2>&1 | tail -20
```

If it fails, surface the exact error with file:line. Common failures after a fresh scaffold:

- TypeScript can't find the new manifest's import — usually `@bkrdy/platform` path typo
- JSX syntax error inside the CSS template literal (backticks, `${}` interpolation)
- Missing `'use client'` directive at the top of `.tsx` files that use hooks
- Hardcoded `https://app.bkrdy.me` URLs (lint rule against them is documented in AUTHORING.md)

Fix and re-run until it passes. Don't claim success without a clean build.

## Step 6: Report

Once both checks pass, summarize:

```
✓ Template created: {Name}

Files written:
  web/templates/{slug}/manifest.ts
  web/templates/{slug}/{Pascal}Template.tsx
  web/templates/{slug}/{Pascal}Booking.tsx
  web/templates/{slug}/{Pascal}CustomerAuth.tsx
  web/templates/{slug}/{Pascal}CustomerAccountWidget.tsx
Updated:
  web/templates/registry.ts
  api/app/Support/TemplateDefaults.php

Checks:
  Manifest validation: ✓ passed
  npm run build:       ✓ passed

To preview on a real tenant:
  Point an existing tenant's template_settings at the new slug, then
  load its public site. NOTE: tenant tables have NO `tenant_id` column —
  tenancy()->initialize() switches the DB connection, so there's exactly
  one template_settings row in the tenant DB. Do NOT filter by tenant_id
  (that errors with "Unknown column 'tenant_id'").
    php artisan tinker --execute='
      $t = App\Models\Tenant::find("your-test-tenant");
      tenancy()->initialize($t);
      DB::table("template_settings")->update(["template_slug" => "{slug}"]);
      tenancy()->end();
    '
  Then: curl -s https://{your-test-tenant}.bkrdy.me/ -o /dev/null -w "%{http_code}"

To stand up a fresh DEMO tenant to show the template off (no login needed
for the public site), create the tenant + domain + a template_settings row
seeded from TemplateDefaults, then seed services/hours/gallery/etc. Seeding
copy in PHP and piping it over SSH (`ssh root@... "cat > /tmp/seed.php" <
local.php; ssh root@... "php artisan tinker --execute=\"require '/tmp/seed.php'\""`)
avoids bash heredoc EOF parse errors on large blocks. To give the demo an
owner login: `App\Models\User::create([... "tenant_id"=>"{slug}",
"password"=>bcrypt("demo1234"), "terms_accepted_at"=>now()])`.

Next steps before submitting to the marketplace:
  - Refine the hero + Book tab first (biggest visual impact)
  - Test with empty-data + maximum-data tenant fixtures
  - Verify every palette swatch passes WCAG AA contrast
  - Confirm prefers-reduced-motion gates all animations
  - Read web/packages/platform/AUTHORING.md to catch anything you missed
```

## Edge cases

- **Slug already taken** → check `web/templates/` before writing. If taken, suggest a variant (`{slug}-2`, longer form, etc.) and ask the creator to pick.
- **Creator wants to skip backend defaults** → fine. The template still works (falls through the `default` match arm to TFR seeds). Just note "no backend changes; new tenants on {slug} will be seeded with The Fade Room's default copy" in the final report.
- **Creator wants to skip build verification** → respect this, but make the consequences explicit in the report ("Build NOT verified; you'll catch TypeScript errors on your next `npm run build`").
- **Creator provides only 1 color** → ask for at least 2. Single-color palettes don't pass the manifest schema (`minItems: 2`).
- **Creator wants the template to not register yet** (private development) → skip step 3, mention it in the summary, recommend they `git stash` the file or comment out the entry until ready.

## Reference materials in this codebase

This skill orchestrates work against existing platform resources. The most important reads:

- **`web/templates/ARCHITECTURE.md`** — the canonical doc on how templates are built today: the three layers (editor/data, shared render, per-template render), the canonical token contract, the similarity matrix, and the shared `@bkrdy/platform/sections` API. Read this first for the big picture.
- `web/packages/platform/AUTHORING.md` — full creator contract; the 12 required sections + 10 required booking behaviors are the spec
- `web/packages/platform/src/manifest.schema.json` — formal manifest schema
- `web/packages/platform/src/validateManifest.ts` — same checks, runtime form
- `web/packages/platform/src/sections/` — the 9 shared section components + `SECTIONS_CSS` + the `theme.ts` token contract you bridge onto. Read `FaqSection.tsx`, `ReviewsSection.tsx`, `InstructionsSection.tsx` to confirm prop shapes before composing.
- `web/templates/opaline/` — the **base/closest-to-shared** example, smallest skin layer (~0 lines of `.brk-*` overrides). The cleanest read for "this is what composing the shared sections looks like."
- `web/templates/thefaderoom/` — the **distinctive-skin** example (~150-line `.tfr-template .brk-*` block reproducing neon + tilt + glowing tab rail). Read this when your brand is far from the base.
- `web/templates/velvettheory/` — example of `color_role: 'background'`, the booking shim pattern, and a CSS-counter trick for roman-numeral policy markers.
- `web/templates/lushstudio/` — a heavily-skinned template that ALSO carries the LUSH_CSS booking-CSS pattern (its CSS lives in `web/packages/platform/src/booking/lushBookingCss.ts`, not its own template file). Useful as a structural ref, but DO NOT copy that split for a new template — keep your CSS in `{Pascal}_CSS` inside your template file.
- `web/templates/_example-blank/` — **stale**. Predates the shared-sections system and hand-rolls all 12 sections. Don't use as the structural reference; copy from Opaline instead.
- `api/app/Support/TemplateDefaults.php` — the Lush + VT `match` arms are the reference shape for step 4; `KNOWN_SLUGS` (top of file) gates the sign-up template-slug whitelist.

## Tone

Treat this like a design conversation, not a form-filling exercise. Confirm answers conversationally before moving on. Offer suggestions when the creator stalls ("Want me to suggest 4 colors that go with cream + ocean blue?"). When generating files, don't read them all back at the user — just write them and report paths. The summary at the end is the only wall-of-text moment.
