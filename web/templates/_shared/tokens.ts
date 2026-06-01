/**
 * BookReady platform design tokens.
 *
 * Every marketplace template MUST consume these values rather than inventing
 * its own. The marketplace gate validates that no template defines ad-hoc
 * spacing, radius, or font sizes outside this module.
 *
 * Two consumption modes:
 *   1. Import the JS constants directly:  `import { space } from '@/templates/_shared/tokens'`
 *   2. Inject the CSS variable block into a scoped <style>, then reference
 *      `var(--brk-space-lg)` etc. from the template's stylesheet.
 *
 * The `--brk-` prefix ("BookReady") avoids any chance of collision with a
 * template's own scoped vars (e.g. `--tfr-*`, `--lush-*`, `--vt-*`).
 */

// ─── Spacing scale (8px base) ──────────────────────────────────────────────────
//
// Eight tokens cover everything from 4px hairline gaps to 96px hero padding.
// Mixing tokens is encouraged; inventing intermediate values is not.

export const space = {
  xs:    4,
  sm:    8,
  md:   16,
  lg:   24,
  xl:   32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
} as const

// ─── Border radius ─────────────────────────────────────────────────────────────
//
// Only three values. Sharp (none), card (6px for inputs/cards), or fully
// rounded pill (999px). No 12/14/24/28 ad-hoc curves — those create the
// "everything looks slightly different per template" problem we just audited.

export const radius = {
  none: 0,
  card: 6,
  pill: 999,
} as const

// ─── Typography scale ──────────────────────────────────────────────────────────
//
// Sizes use clamp() so a single token covers mobile → desktop. Templates
// pick which font-family per role; the size is fixed by the token.
//
// `eyebrow` is small uppercase metadata: pair with letter-spacing 0.18em and
// text-transform: uppercase in your own CSS.

export const font = {
  display:  'clamp(3.5rem, 7vw, 6.5rem)',  // hero name
  h1:       'clamp(2.5rem, 6vw, 4rem)',
  h2:       'clamp(2rem,   5vw, 3rem)',
  h3:       '1.375rem',
  bodyLg:   '1.125rem',
  body:     '1rem',
  bodySm:   '0.875rem',
  eyebrow:  '0.6875rem',
} as const

// ─── Container widths ──────────────────────────────────────────────────────────

export const container = {
  narrow:    720,   // long-form reading: thank-you, FAQ
  standard: 1080,   // most editorial sections
  wide:     1180,   // multi-column footers, full galleries
} as const

// ─── Responsive breakpoints ────────────────────────────────────────────────────
//
// Three tiers, no exceptions. Templates MAY add intermediate breakpoints
// (e.g. 720px / 1080px for finer grid changes) but MUST handle these three.

export const breakpoint = {
  mobileMax:  640,   // max-width: 640px — single-column layout
  tabletMin:  641,   // min-width: 641px — two-column starts
  tabletMax: 1024,   // max-width: 1024px — tablet ends
  desktopMin: 1025,  // min-width: 1025px — full multi-column
} as const

// ─── Motion ────────────────────────────────────────────────────────────────────
//
// Three durations, two easings. Any keyframe animation MUST be wrapped in
// `@media (prefers-reduced-motion: no-preference) { ... }` by the consuming
// template — the platform doesn't enforce that automatically.

export const motion = {
  duration: {
    fast: 160,
    base: 200,
    slow: 280,
  },
  easing: {
    standard: 'ease',
    emphasis: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const

// ─── CSS variable emission ─────────────────────────────────────────────────────

/**
 * Returns a CSS string of all platform tokens as `--brk-*` custom properties.
 *
 * Templates inject this at the top of their scoped <style> block so consumers
 * (including the shared booking module) can read `var(--brk-space-lg)` etc.
 *
 * Usage:
 *   <style>{`
 *     .my-template { ${tokensToCss()} }
 *     .my-template .section { padding: var(--brk-space-4xl) var(--brk-space-md); }
 *   `}</style>
 */
export function tokensToCss(): string {
  const motionDuration = motion.duration
  const motionEasing = motion.easing
  return `
    --brk-space-xs:  ${space.xs}px;
    --brk-space-sm:  ${space.sm}px;
    --brk-space-md:  ${space.md}px;
    --brk-space-lg:  ${space.lg}px;
    --brk-space-xl:  ${space.xl}px;
    --brk-space-2xl: ${space['2xl']}px;
    --brk-space-3xl: ${space['3xl']}px;
    --brk-space-4xl: ${space['4xl']}px;

    --brk-radius-none: ${radius.none}px;
    --brk-radius-card: ${radius.card}px;
    --brk-radius-pill: ${radius.pill}px;

    --brk-font-display:  ${font.display};
    --brk-font-h1:       ${font.h1};
    --brk-font-h2:       ${font.h2};
    --brk-font-h3:       ${font.h3};
    --brk-font-body-lg:  ${font.bodyLg};
    --brk-font-body:     ${font.body};
    --brk-font-body-sm:  ${font.bodySm};
    --brk-font-eyebrow:  ${font.eyebrow};

    --brk-container-narrow:   ${container.narrow}px;
    --brk-container-standard: ${container.standard}px;
    --brk-container-wide:     ${container.wide}px;

    --brk-motion-fast:     ${motionDuration.fast}ms;
    --brk-motion-base:     ${motionDuration.base}ms;
    --brk-motion-slow:     ${motionDuration.slow}ms;
    --brk-motion-standard: ${motionEasing.standard};
    --brk-motion-emphasis: ${motionEasing.emphasis};
  `
}
