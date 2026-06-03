/**
 * SECTIONS_CSS — shared stylesheet for the platform section components.
 *
 * Inject once at the root of a template's render:
 *   <style>{SECTIONS_CSS}</style>
 *
 * Every rule is styled against the canonical tokens only:
 *   - color roles:  --brk-color-{bg,surface,text,muted,rule,accent,on-accent}
 *   - font families: --brk-family-{display,body,script}
 *   - sizes/spacing/motion: the global --brk-* tokens from tokensToCss()
 *     (referenced with literal fallbacks so a template that hasn't injected
 *      tokensToCss() still lays out correctly).
 *
 * Rules are intentionally NOT scoped to a template class — they match the
 * `.brk-*` classes the section components render, and inherit the canonical
 * vars from whatever template root wraps them (same model as the shared
 * booking CSS / `.brk-booking-*`). A template adds its signature flourishes
 * in its own scoped <style> AFTER this one (e.g. `.my-template .brk-faq { … }`).
 *
 * NOTE: no backticks or ${} inside this template literal — it is pure CSS.
 */
export const SECTIONS_CSS = `
/* ── Section shell (generalizes the per-template eyebrow + title header) ── */
.brk-section {
  max-width: var(--brk-container-standard, 1080px);
  margin: 0 auto;
  padding: clamp(64px, 8vw, 104px) var(--brk-space-md, 16px);
}
.brk-section-head {
  text-align: center;
  margin: 0 auto 44px;
  max-width: 640px;
}
.brk-eyebrow {
  margin: 0;
  font-family: var(--brk-family-body, sans-serif);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: var(--brk-color-accent, currentColor);
}
.brk-section-title {
  margin: 14px 0 0;
  font-family: var(--brk-family-display, serif);
  font-weight: 500;
  font-size: clamp(38px, 5.4vw, 60px);
  line-height: 1.04;
  letter-spacing: 0.005em;
  color: var(--brk-color-text, inherit);
}

/* ── FAQ — native <details> accordion ── */
.brk-faq-list {
  max-width: 760px;
  margin: 0 auto;
  border-top: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12));
}
.brk-faq {
  border-bottom: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12));
}
.brk-faq summary {
  list-style: none;
  cursor: pointer;
  padding: 26px 40px 26px 0;
  position: relative;
  font-family: var(--brk-family-display, serif);
  font-weight: 500;
  font-size: 22px;
  color: var(--brk-color-text, inherit);
}
.brk-faq summary::-webkit-details-marker { display: none; }
.brk-faq summary::after {
  content: '+';
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--brk-family-body, sans-serif);
  font-size: 22px;
  font-weight: 300;
  color: var(--brk-color-accent, currentColor);
  transition: transform var(--brk-motion-base, 200ms) var(--brk-motion-standard, ease);
}
.brk-faq[open] summary::after { content: '\\2013'; }
.brk-faq p {
  margin: 0;
  padding: 0 40px 28px 0;
  font-family: var(--brk-family-body, sans-serif);
  font-size: 15px;
  line-height: 1.75;
  color: var(--brk-color-muted, inherit);
}
@media (prefers-reduced-motion: reduce) {
  .brk-faq summary::after { transition: none !important; }
}
`
