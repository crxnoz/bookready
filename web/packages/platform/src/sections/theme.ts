/**
 * Canonical THEME token contract for shared section components.
 *
 * The platform's tokens.ts already emits global `--brk-*` tokens for SPACING,
 * RADIUS, font SIZES, containers and motion (via `tokensToCss()`). Those are
 * identical for every template. This file adds the layer that *differs* per
 * template — the color roles and font FAMILIES — as canonical
 * `--brk-color-*` and `--brk-family-*` custom properties.
 *
 * Shared section components (see SECTIONS_CSS) are styled entirely against
 * these canonical vars plus the global size tokens, so a template gets the
 * shared look "for free" once it bridges its own palette onto them.
 *
 * Two bridging modes — pick whichever fits the template:
 *
 *  1. CSS aliasing (zero JS), inside the template's scoped <style>:
 *       .my-template {
 *         --brk-color-bg:   var(--my-bg);
 *         --brk-color-text: var(--my-ink);
 *         --brk-color-accent: var(--my-accent);
 *         ...
 *       }
 *     This is ideal when the template already defines its own vars (it also
 *     means a runtime accent override on `--my-accent` flows through for free).
 *
 *  2. JS injection — `<style>{themeVarsToCss(theme)}</style>` — when the
 *     template would rather declare its palette in TS.
 *
 * The `--brk-family-*` names are deliberately distinct from the size token
 * `--brk-font-*` (a font SIZE) to avoid collision.
 */

export interface SectionTheme {
  /** Page canvas / background. */
  bg: string
  /** Raised surface — cards, panels. */
  surface: string
  /** Primary text / ink. */
  text: string
  /** Secondary / muted text. */
  muted: string
  /** Hairline + border color. */
  rule: string
  /** Accent color. */
  accent: string
  /** Text/icon color that sits legibly on an accent fill. */
  onAccent: string
  /** Display / heading font stack. */
  familyDisplay: string
  /** Body / UI font stack. */
  familyBody: string
  /** Optional decorative script font stack. */
  familyScript?: string
}

/**
 * Emit the canonical theme vars as a CSS declaration block. Inject inside a
 * scoped selector, e.g. `.my-template { ${themeVarsToCss(theme)} }`.
 */
export function themeVarsToCss(t: SectionTheme): string {
  return [
    `--brk-color-bg: ${t.bg};`,
    `--brk-color-surface: ${t.surface};`,
    `--brk-color-text: ${t.text};`,
    `--brk-color-muted: ${t.muted};`,
    `--brk-color-rule: ${t.rule};`,
    `--brk-color-accent: ${t.accent};`,
    `--brk-color-on-accent: ${t.onAccent};`,
    `--brk-family-display: ${t.familyDisplay};`,
    `--brk-family-body: ${t.familyBody};`,
    t.familyScript ? `--brk-family-script: ${t.familyScript};` : '',
  ].filter(Boolean).join('\n')
}
