# Authoring BookReady Templates

This document is the contract every marketplace template must satisfy. It is also a practical guide for someone building a template from scratch. Read it in order; each section builds on the previous one.

## What a template is

A BookReady template renders a tenant's public booking site. It receives a single `PublicSite` payload from the API and is responsible for:

- Displaying the tenant's business identity (header)
- Embedding a 5-step booking flow (`Service → Add-ons → Date & Time → Details → Confirm`)
- Showing the tenant's gallery, results, about, policies, advice, timeline, FAQ, reviews, and thank-you sections
- A footer

A template is **not** responsible for:

- Authenticating users (the customer-account widget is provided)
- Validating bookings (the booking flow handles that)
- Talking to the BookReady API (`getPublicSite` is the entry point)
- Persisting any state (everything flows through the editor)

## Package layout

```
your-template/
├─ manifest.ts          ← declares what the template surfaces (REQUIRED)
├─ YourTemplate.tsx     ← the React component the platform renders (REQUIRED)
├─ YourBooking.tsx      ← booking-flow wrapper (REQUIRED for v1)
└─ (any internal files) ← scoped per template, no platform contract
```

Every file is colocated in your template's folder. No reaching out to other templates' directories. (The `PlatformBookingFlow` and `CustomerAuth` you wrap come from `@bkrdy/platform`.)

## The manifest

`manifest.ts` is the single source of truth for what your template supports. The BookReady editor reads it to decide which controls to show to the tenant. The submission portal validates it on submission and rejects malformed manifests outright.

The canonical shape:

```ts
import type { TemplateManifest } from '@bkrdy/platform'

const manifest: TemplateManifest = {
  slug:    'cool-salon',                                            // matches your folder name
  name:    'Cool Salon',                                            // shown to tenants
  version: '1.0.0',                                                 // semver

  // 'accent'     → palette swatches change a highlight color
  // 'background' → palette swatches change the page background
  color_role: 'accent',
  color_palette: [
    { hex: '#FF3DBE', label: 'Pink (default)' },
    { hex: '#22F5A3', label: 'Mint' },
    { hex: '#3DA9FC', label: 'Blue' },
  ],

  // Which header fields you actually render. The editor hides controls
  // for fields you don't list, so a tenant can't upload an avatar that
  // your template would silently ignore.
  header_fields: [
    'cover_image',
    'avatar_image',
    'announcement',
    'business_type',
    'social_buttons',
  ],

  // Same for the footer.
  footer_fields: [
    'show_powered_by',
    'show_hours',
    'show_quick_book',
    'show_contact_links',
    'business_name_override',
    'subtext',
  ],
}

export default manifest
```

The exact contract is in [`manifest.schema.json`](./manifest.schema.json). Run [`validateManifest()`](./validateManifest.ts) against your file before submitting.

### Field tokens

`header_fields` tokens:

| Token | What it means |
|---|---|
| `cover_image` | You render `header.cover_image_url` somewhere in the hero |
| `avatar_image` | You render `header.avatar_image_url` somewhere in the hero |
| `announcement` | You render the announcement bar driven by `header.announcement_text` + `header.show_announcement` |
| `business_type` | You render `profile.business_type` in the header (e.g. "Barbershop", "Spa") |
| `social_buttons` | You render the 11-platform social-button cluster + URL overrides |

`footer_fields` tokens:

| Token | What it means |
|---|---|
| `show_powered_by` | You honor the toggle that shows/hides the BookReady badge |
| `show_hours` | You render the business hours when toggled on |
| `show_quick_book` | You render a Quick Book pill when toggled on |
| `show_contact_links` | You render the contact info row when toggled on |
| `business_name_override` | You read `footer.business_name_override` instead of the profile name when present |
| `subtext` | You render `footer.subtext` somewhere in the footer |

Each token is a **promise**. If you declare it, you must render it. If you don't declare it, the editor hides the control for tenants on your template.

## Required sections

Every template must render these sections, even if the data is empty:

1. **Header / Hero** — identity, brand, announcement, social buttons
2. **Booking** — embed the platform's 5-step booking flow
3. **Gallery** — `site.gallery` + `site.gallery_groups`
4. **Results** — `site.results` + `site.results_groups` (before/after pairs)
5. **About** — `template.settings.about` (heading, eyebrow, body, images)
6. **Policies** — `site.policies` (six named fields + `custom_groups`)
7. **Advice** — `template.settings.advice.items[]`
8. **Timeline** — `template.settings.timeline.items[]`
9. **FAQ** — `template.settings.additionals.faq` when enabled + non-empty
10. **Reviews** — `template.settings.additionals.reviews` when enabled + non-empty
11. **Thank-you** — `template.settings.additionals.{thank_you_title, thank_you_body}` when enabled
12. **Footer**

Style and layout are free. You can make sections look like cards, scrollable rails, polaroids, editorial strips — anything. But the data they consume is fixed.

## Required booking behavior

Every template's booking flow must:

1. Implement the canonical 5-step sequence: **Service → Add-ons → Date & Time → Details → Confirm** (with optional pre-step Category picker when ≥2 categories used; auto-skip Add-ons when none linked)
2. Show service **duration AND price** on every service card
3. Show running total + duration when add-ons are selected
4. Offer the **staff picker** when `availableStaff.length ≥ 2`
5. Show the **SMS consent** checkbox with the exact TCR-compliant copy when phone is provided
6. Show the **policy agreement** checkbox when `policies.require_policy_agreement === true`
7. Show the **deposit-vs-full** picker when both `deposits_enabled` and `allow_full_payment` are true
8. Show Stripe-return banners on `?booking=success` and `?booking=success&account=new`
9. Render all five kinds of `booking_questions[]` (text, textarea, checkbox, dropdown, image-upload)
10. POST to `/api/v1/public/sites/{slug}/appointments` using the canonical `PublicBookingPayload` shape

The simplest way to satisfy all ten requirements is to wrap the platform's `PlatformBookingFlow`:

```tsx
import { PlatformBookingFlow, CustomerAuthProvider, PLATFORM_BOOKING_CSS } from '@bkrdy/platform'
import { LUSH_CSS } from '@bkrdy/platform/booking-css'

// (M2c.1 today: classes are .brk-booking-*; we ship the booking flow CSS
// under that prefix. Wrap the flow in a div with a scoping class that
// applies your color/font variables.)

export default function CoolSalonBooking(props: PlatformBookingFlowProps) {
  return (
    <CustomerAuthProvider>
      <style>{PLATFORM_BOOKING_CSS}</style>
      <style>{COOL_SALON_VARS_CSS}</style>
      <div className="cool-salon-booking">
        <PlatformBookingFlow {...props} />
      </div>
    </CustomerAuthProvider>
  )
}

const COOL_SALON_VARS_CSS = `
  .cool-salon-booking {
    --brk-booking-bg:     #FAF5EE;
    --brk-booking-fg:     #1a1a1a;
    --brk-booking-accent: #FF3DBE;
    /* ...etc. See @bkrdy/platform/tokens for the full list. */
  }
`
```

You override the booking's appearance via CSS variables. You don't fork the JSX. (CSS variable theming hooks are being finalized in M2c.3; until then templates wrap `<div className="lush-template">` for backward compat. The platform package will document the cutover.)

## CSS scoping

Every template must scope every rule under a unique root class:

```css
.cool-salon-template { /* ... */ }
.cool-salon-template .cool-salon-hero { /* ... */ }
```

No unprefixed selectors (`p`, `a`, `.button`). No modifying `:root`, `html`, or `body`. No global resets.

The platform booking CSS is scoped to `.brk-booking-flow` (and currently to `.lush-template` for backward compat). Your template's CSS only needs to handle template chrome, not booking chrome.

## Design system tokens

The platform exports a token scale at `@bkrdy/platform`:

```ts
import { space, radius, font, container, breakpoint, motion, tokensToCss } from '@bkrdy/platform'
```

Templates **must** use these tokens for spacing, radii, font sizes, container widths, and motion durations. Inventing intermediate values (e.g. a 14px radius, a 22px gap) is a marketplace rejection.

Inject the CSS-variable form into your scoped stylesheet so you can reference `var(--brk-space-lg)` etc.:

```tsx
<style>{`
  .cool-salon-template { ${tokensToCss()} }
  .cool-salon-template .hero { padding: var(--brk-space-4xl) var(--brk-space-md); }
`}</style>
```

## Responsive breakpoints

Templates must handle three tiers (more is fine; fewer is a rejection):

- **Mobile**: `max-width: 640px` — single column
- **Tablet**: `641-1024px` — at least partial two-column for galleries / footer
- **Desktop**: `≥ 1025px` — full multi-column

Use `breakpoint.mobileMax` / `tabletMin` / `desktopMin` from `@bkrdy/platform` for the values.

## Accessibility

The marketplace bar is **WCAG 2.2 AA**:

- All form inputs have `<label>` association (wrap or `for=`)
- Required fields have `aria-required="true"` AND a visible indicator
- Form errors set `aria-invalid="true"` and reference `aria-describedby` on the error node
- All text meets 4.5:1 contrast (body) or 3:1 (large text). Don't use blanket `opacity` to dim text without checking final contrast on every supported background variant.
- Tab navigation containers have `role="tablist"` parents matching `role="tab"` children
- Modals trap focus, support Escape to close, use `role="dialog" aria-modal="true"` (the platform's `CustomerAuth` modal handles this for you)
- All keyframe animations are wrapped in `@media (prefers-reduced-motion: no-preference) { ... }`

## URL safety

User-provided URLs (social links, custom policies, etc.) flow through `safeHref` (exported by `@bkrdy/platform`) to allowlist `http`, `https`, `mailto`, `tel`, `sms`. Never write user URLs directly into `href`. The marketplace will reject any template that does.

## No template-to-template coupling

A template cannot import from another template's directory or package. Shared code goes through `@bkrdy/platform`. If you find yourself wanting to depend on another template, open an issue — the shared code should be promoted to the platform.

## Storage discipline

A template may add new keys to `template.settings.{your_namespace}.*`. These are stored verbatim in the JSON blob and deep-merged on read. Use a clear namespace (e.g. `cool_salon_extras`) to avoid colliding with platform-reserved keys.

A template may **not** redefine the semantic of an existing key (e.g. interpreting `theme.accent_color` as a font size). Use a new namespaced key instead.

A template must ship its own seed defaults via `TemplateDefaults` (backend) — never inherit another template's seed copy.

## Testing locally

```bash
git clone https://github.com/bkrdy/template-starter cool-salon
cd cool-salon
npm install
npm run dev       # launches a demo BookReady environment with your template registered
npm run validate  # runs validateManifest() + bundle-size + lint checks
npm test          # runs the rendering harness against a synthetic PublicSite fixture
```

`npm run validate` is the same script the submission portal runs. Passing locally does not guarantee marketplace acceptance — the visual + UX review is still manual — but it does guarantee the structural checks pass.

## Submission

When your template is ready:

1. Run `npm run validate` — fix any reported issues
2. Run `npm run audit` — review the marketplace compliance report
3. Publish your package to npm under your scope (`@cool-salon-co/cool-salon`)
4. Open a submission at [marketplace portal — coming Phase 2]
5. Provide: package URL, repo URL, 3-6 screenshots, demo PublicSite fixture (optional), price (or free), brief description

A reviewer responds within 5 business days. Most rejections are about visual polish (sections too cramped on mobile, contrast borderline on certain palette options) or missing required sections.

## What's stable vs. what's still moving

The marketplace platform is in v0. These pieces are stable:

- The manifest schema (this document + the JSON Schema)
- The PublicSite payload shape (the API response your template renders)
- The booking POST contract
- The section taxonomy (the 12 sections above)
- The token scale

These pieces are still settling and may change in the next 2-3 releases:

- The CSS variable theming hooks (`--brk-booking-*`) — M2c.3 finalizes these
- The platform's npm package structure (`@bkrdy/platform`) — Phase 1 publishes it
- The submission portal — Phase 2 builds it
- Stripe Connect creator onboarding — Phase 3 launches it

Pin your `@bkrdy/platform` dependency to a caret range (`^0.x`) and watch the changelog. We'll send a breaking-change notice at least 30 days before any contract change.
