---
name: template-creator
description: Scaffold a new BookReady template end-to-end — manifest.ts, render component, booking wrapper, customer-auth re-exports, registry registration, backend TemplateDefaults branch, manifest validation, and `npm run build` verification. Use whenever the user wants to create, scaffold, generate, build, or add a new template to BookReady, even when they don't explicitly say "scaffold" — phrases like "I want a new template called X", "make a template for beach spas", "build a Velvet-style template called Y", "add a luxury barber template", or "design a new template" should all trigger this skill. Always interactive — runs a focused interview to capture brand direction, color palette, fonts, and which manifest fields the template surfaces, then writes a complete working skeleton in one invocation.
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

Use `web/templates/_example-blank/ExampleBlankTemplate.tsx` as the structural reference — it renders every required section in the simplest possible way. Copy that structure and customize:

- Replace the `eb-` class prefix with `{prefix}-` throughout
- Replace the root class `.eb-template` with `.{prefix}-template`
- Apply the chosen palette via CSS variables in the scoped `<style>` block (e.g., `--{prefix}-accent: {hex_1}`)
- Apply the chosen fonts via `font-family` declarations
- Tweak hero / about / footer typography to match the vibe (serif scale for luxury, large script accents for feminine, etc.)

The 12 required sections (from `web/packages/platform/AUTHORING.md` §"Required sections"):

1. Announcement bar
2. Header / Hero
3. Booking (embed via `{Pascal}Booking.tsx`)
4. Gallery
5. Results
6. About
7. Policies
8. Advice
9. Timeline
10. FAQ
11. Reviews
12. Thank-you outro + Footer

Every section must render — empty data shows an empty state, not nothing.

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
      {/* M2c.2 will drop the .lush-template wrapper; until then it scopes the
          platform CSS. Keep the {prefix}-booking class as the template's own
          handle for variable overrides. */}
      <div className="lush-template {prefix}-booking">
        <PlatformBookingFlow {...props} />
      </div>
    </CustomerAuthProvider>
  )
}

const {Pascal}_BOOKING_FRAME_CSS = `
  .{prefix}-booking {
    /* CSS variable overrides go here once M2c.3 ships the --brk-booking-* hooks.
       For now, override Lush's variables to re-skin colors:
         --lush-pink:     {accent hex};
         --lush-pink-rgb: {accent comma triplet};
         --lush-bg:       {bg hex};
         --lush-text:     {text hex};
       (See web/templates/velvettheory/VelvetTheoryBooking.tsx for the full
        variable-override pattern.) */
  }
`
```

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
  {slug}:       () => import('./{slug}/{Pascal}Template'),
}

const MANIFESTS: Record<string, ManifestLoader> = {
  thefaderoom:  () => import('./thefaderoom/manifest'),
  lushstudio:   () => import('./lushstudio/manifest'),
  velvettheory: () => import('./velvettheory/manifest'),
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
        '{slug}'       => self::{camel}Settings(),  // NEW
        default        => self::theFadeRoomSettings(),
    };
}
public static function sectionsFor(string $templateSlug): array {
    return match ($templateSlug) {
        'thefaderoom'  => self::theFadeRoomSections(),
        'lushstudio'   => self::lushStudioSections(),
        'velvettheory' => self::velvetTheorySections(),
        '{slug}'       => self::{camel}Sections(),  // NEW
        default        => self::theFadeRoomSections(),
    };
}
```

Then implement `{camel}Settings()` and `{camel}Sections()`. Use `lushStudioSettings()` and `velvetTheorySettings()` as structural references — both call `self::theFadeRoomSettings()` as the base then override `header.announcement_text`, `about` (heading + eyebrow + body + highlights), `advice` (items), `timeline` (items), and `footer.subtext` with template-flavored seed copy.

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

To preview locally:
  cd web && npm run dev
  Visit http://localhost:3000/site/{any-tenant} after running:
    php artisan tinker --execute='
      App\Models\Tenant::find("your-test-tenant");
      tenancy()->initialize(App\Models\Tenant::find("your-test-tenant"));
      DB::table("template_settings")
        ->where("tenant_id", "your-test-tenant")
        ->update(["template_slug" => "{slug}"]);
    '

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

- `web/packages/platform/AUTHORING.md` — full creator contract; the 12 required sections + 10 required booking behaviors are the spec
- `web/packages/platform/src/manifest.schema.json` — formal manifest schema
- `web/packages/platform/src/validateManifest.ts` — same checks, runtime form
- `web/templates/_example-blank/` — the official starter; this is what your `{Pascal}Template.tsx` is based on
- `web/templates/lushstudio/` — most complete real-world example of a templated brand including the LUSH_CSS booking-CSS pattern
- `web/templates/velvettheory/` — example of `color_role: 'background'` and the booking shim pattern
- `api/app/Support/TemplateDefaults.php` — the Lush + VT `match` arms are the reference shape for step 4

## Tone

Treat this like a design conversation, not a form-filling exercise. Confirm answers conversationally before moving on. Offer suggestions when the creator stalls ("Want me to suggest 4 colors that go with cream + ocean blue?"). When generating files, don't read them all back at the user — just write them and report paths. The summary at the end is the only wall-of-text moment.
