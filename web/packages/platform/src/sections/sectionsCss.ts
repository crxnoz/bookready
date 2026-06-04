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
/* ── Reviews — testimonial cards ── */
.brk-reviews {
  list-style: none;
  margin: 0 auto;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  max-width: 1000px;
}
@media (min-width: 821px) { .brk-reviews { grid-template-columns: repeat(2, 1fr); } }
.brk-review {
  position: relative;
  padding: 40px 36px 32px;
  background: var(--brk-color-surface, #fff);
  border: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12));
  border-radius: 4px;
}
.brk-review-quote {
  position: absolute;
  top: 6px;
  left: 22px;
  font-family: var(--brk-family-display, serif);
  font-size: 72px;
  line-height: 1;
  color: var(--brk-color-accent, currentColor);
  opacity: 0.32;
}
.brk-review-stars { color: var(--brk-color-accent, currentColor); font-size: 11px; letter-spacing: 0.3em; margin: 0 0 14px; }
.brk-review blockquote {
  margin: 0 0 18px;
  font-family: var(--brk-family-display, serif);
  font-style: italic;
  font-size: 22px;
  line-height: 1.5;
  color: var(--brk-color-text, inherit);
}
.brk-review-attr {
  margin: 0;
  font-family: var(--brk-family-body, sans-serif);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--brk-color-muted, inherit);
}

/* ── Thank-you ── */
.brk-thanks { text-align: center; max-width: 680px; }
.brk-thanks-title {
  margin: 14px 0 0;
  font-family: var(--brk-family-display, serif);
  font-weight: 500;
  font-size: clamp(40px, 6vw, 64px);
  line-height: 1.06;
  color: var(--brk-color-text, inherit);
}
.brk-thanks-body {
  margin: 22px auto 0;
  max-width: 52ch;
  font-family: var(--brk-family-body, sans-serif);
  font-size: 17px;
  line-height: 1.8;
  color: var(--brk-color-muted, inherit);
}
.brk-thanks-sign {
  margin: 30px 0 0;
  font-family: var(--brk-family-display, serif);
  font-style: italic;
  font-size: 24px;
  color: var(--brk-color-accent, currentColor);
}

/* ── Footer — 3-band (CTA / columns / credit) ── */
.brk-footer { border-top: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12)); background: var(--brk-color-surface, transparent); }
.brk-footer-cta-band {
  padding: clamp(48px, 6vw, 72px) 24px;
  text-align: center;
  border-bottom: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12));
}
.brk-footer-book {
  display: inline-flex;
  align-items: center;
  padding: 17px 44px;
  background: var(--brk-color-accent, currentColor);
  color: var(--brk-color-on-accent, #fff);
  border: 1px solid var(--brk-color-accent, currentColor);
  border-radius: 2px;
  font-family: var(--brk-family-body, sans-serif);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  cursor: pointer;
  transition: filter 180ms ease;
}
.brk-footer-book:hover { filter: brightness(1.05); }
.brk-footer-inner {
  max-width: var(--brk-container-standard, 1080px);
  margin: 0 auto;
  padding: clamp(56px, 7vw, 80px) var(--brk-space-md, 16px);
  display: grid;
  grid-template-columns: 1fr;
  gap: 44px;
}
@media (min-width: 720px) {
  .brk-footer-inner { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0; }
  .brk-footer-col { padding: 0 44px; }
  .brk-footer-col:first-child { padding-left: 0; }
  .brk-footer-col:last-child { padding-right: 0; }
  .brk-footer-col + .brk-footer-col { border-left: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12)); }
}
.brk-footer-col { display: flex; flex-direction: column; gap: 14px; }
.brk-footer-brand { gap: 12px; }
.brk-footer-col--hours { min-width: 250px; }
.brk-footer-name {
  margin: 0;
  font-family: var(--brk-family-display, serif);
  font-weight: 500;
  font-size: 34px;
  line-height: 1;
  color: var(--brk-color-text, inherit);
}
.brk-footer-subtext {
  margin: 4px 0 0;
  font-family: var(--brk-family-body, sans-serif);
  font-size: 14px;
  line-height: 1.65;
  color: var(--brk-color-muted, inherit);
  max-width: 34ch;
}
.brk-footer-hours { margin: 0; display: flex; flex-direction: column; }
.brk-footer-hours-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  padding: 9px 0;
  border-top: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12));
  font-family: var(--brk-family-body, sans-serif);
  font-size: 13px;
}
.brk-footer-hours-row:first-child { border-top: 0; padding-top: 0; }
.brk-footer-hours-row dt {
  margin: 0;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 11px;
  color: var(--brk-color-text, inherit);
}
.brk-footer-hours-row dd { margin: 0; color: var(--brk-color-muted, inherit); font-variant-numeric: tabular-nums; }
.brk-footer-contact { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; font-family: var(--brk-family-body, sans-serif); font-size: 14px; }
.brk-footer-contact a { color: var(--brk-color-text, inherit); transition: color 180ms ease; }
.brk-footer-contact a:hover { color: var(--brk-color-accent, currentColor); }
.brk-footer-credit-band {
  padding: 18px 24px;
  border-top: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12));
  text-align: center;
}
.brk-footer-credit-band p {
  margin: 0;
  font-family: var(--brk-family-body, sans-serif);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--brk-color-muted, inherit);
}

/* ── Instructions (Advice / Timeline) ── */
.brk-empty {
  text-align: center;
  color: var(--brk-color-muted, inherit);
  font-style: italic;
  font-family: var(--brk-family-display, serif);
  font-size: 19px;
  padding: 28px 0;
}
.brk-instructions { list-style: none; margin: 0 auto; padding: 0; max-width: 720px; }
.brk-instruction {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 18px;
  padding: 28px 0;
  border-top: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12));
  align-items: start;
}
.brk-instruction:last-child { border-bottom: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12)); }
.brk-instructions--plain .brk-instruction { grid-template-columns: 1fr; }
.brk-instruction-mark {
  color: var(--brk-color-accent, currentColor);
  font-size: 13px;
  line-height: 1.9;
  text-align: center;
}
.brk-instructions--numbered .brk-instruction {
  grid-template-columns: auto 1fr;
  gap: 26px;
  padding: 30px 0;
  align-items: baseline;
}
.brk-instructions--numbered .brk-instruction-mark {
  font-family: var(--brk-family-display, serif);
  font-weight: 400;
  font-size: 40px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.brk-instruction-kicker {
  display: block;
  margin: 0 0 6px;
  font-family: var(--brk-family-body, sans-serif);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--brk-color-accent, currentColor);
}
.brk-instruction-body h3 {
  margin: 0 0 6px;
  font-family: var(--brk-family-display, serif);
  font-weight: 500;
  font-size: 24px;
  color: var(--brk-color-text, inherit);
}
.brk-instructions--numbered .brk-instruction-body h3 { font-size: 25px; }
.brk-instruction-body p {
  margin: 0;
  font-family: var(--brk-family-body, sans-serif);
  font-size: 15px;
  line-height: 1.7;
  color: var(--brk-color-muted, inherit);
}

/* ── Gallery — captioned buckets of image tiles (Opaline base metrics) ── */
.brk-gallery-group + .brk-gallery-group { margin-top: clamp(40px, 5vw, 64px); }
.brk-gallery-group-heading {
  margin: 0 0 22px;
  text-align: center;
  font-family: var(--brk-family-display, serif);
  font-weight: 500;
  font-size: clamp(24px, 3vw, 32px);
  letter-spacing: 0.005em;
  color: var(--brk-color-text, inherit);
}
.brk-gallery-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}
.brk-gallery-item {
  margin: 0;
  overflow: hidden;
  border-radius: 3px;
  border: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12));
  background: var(--brk-color-surface, #fff);
  aspect-ratio: 4/5;
}
.brk-gallery-item img { width: 100%; height: 100%; object-fit: cover; }
@media (min-width: 641px) { .brk-gallery-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1025px) { .brk-gallery-grid { grid-template-columns: repeat(3, 1fr); gap: 22px; } }
/* Strips variant — full-width rows regardless of breakpoint. */
.brk-gallery-grid--strips { grid-template-columns: 1fr; gap: 22px; }
.brk-gallery-grid--strips .brk-gallery-item { aspect-ratio: 16/9; }

/* ── Before & After — center-separated diptych (Opaline base metrics) ── */
.brk-ba-group + .brk-ba-group { margin-top: clamp(48px, 6vw, 72px); }
.brk-ba-group-heading {
  margin: 0 0 28px;
  text-align: center;
  font-family: var(--brk-family-display, serif);
  font-weight: 500;
  font-size: clamp(24px, 3vw, 32px);
  letter-spacing: 0.005em;
  color: var(--brk-color-text, inherit);
}
.brk-ba-stack { display: flex; flex-direction: column; gap: 56px; max-width: 920px; margin: 0 auto; }
.brk-ba { margin: 0; }
.brk-ba-pair {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
}
.brk-ba-pane { margin: 0; position: relative; }
.brk-ba-pane img {
  width: 100%;
  aspect-ratio: 3/4;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12));
}
.brk-ba-label {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
  padding: 5px 12px;
  background: var(--brk-color-surface, rgba(255,255,255,0.86));
  border: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12));
  border-radius: 999px;
  font-family: var(--brk-family-body, sans-serif);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--brk-color-text, inherit);
}
.brk-ba-sep { color: var(--brk-color-accent, currentColor); font-size: 10px; align-self: center; }
/* Tap-to-reveal "after" image. The button is a transparent wrapper so it
   inherits the existing .brk-ba-pane img sizing/border from each template's
   skin. .is-revealed clears the blur; .brk-ba-reveal-hint floats a small
   prompt over the blurred image until the visitor taps. */
.brk-ba-reveal {
  appearance: none;
  background: transparent;
  border: 0;
  padding: 0;
  margin: 0;
  display: block;
  width: 100%;
  position: relative;
  /* Clip the blur — without this the blurred pixels bleed past the
     image bounds, killing the square/rectangle shape of the pane. */
  overflow: hidden;
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: inherit;
}
.brk-ba-reveal img {
  /* Lighter blur than before (was 14px which was way too strong) +
     a slight scale so the blur-feathered edges hide behind the clip
     instead of revealing the canvas underneath. */
  filter: blur(8px);
  transform: scale(1.06);
  transition: filter 360ms ease, transform 360ms ease;
  display: block;
  width: 100%;
}
.brk-ba-reveal.is-revealed img {
  filter: none;
  transform: scale(1);
}
.brk-ba-reveal-hint {
  /* Fully centered inside the blurred image (vertical + horizontal),
     so the prompt sits at the optical middle regardless of pane height. */
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  padding: 8px 14px;
  background: var(--brk-color-surface, rgba(255,255,255,0.9));
  border: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12));
  border-radius: 999px;
  font-family: var(--brk-family-body, sans-serif);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--brk-color-text, inherit);
  pointer-events: none;
  opacity: 0.94;
  transition: opacity 200ms ease;
}
.brk-ba-reveal.is-revealed .brk-ba-reveal-hint { opacity: 0; }
.brk-ba-reveal:focus-visible {
  outline: 2px solid var(--brk-color-accent, currentColor);
  outline-offset: 4px;
}
@media (prefers-reduced-motion: reduce) {
  .brk-ba-reveal img,
  .brk-ba-reveal-hint { transition: none; }
  .brk-ba-reveal img { transform: scale(1.06); }
  .brk-ba-reveal.is-revealed img { transform: scale(1); }
}
.brk-ba-caption {
  margin: 18px 0 0;
  text-align: center;
  font-family: var(--brk-family-display, serif);
  font-style: italic;
  font-size: 18px;
  color: var(--brk-color-muted, inherit);
}
@media (max-width: 640px) {
  .brk-ba-pair { grid-template-columns: 1fr; }
  .brk-ba-sep { display: none; }
}

/* ── Policies — hairline-divided ledger, no boxes (Opaline base metrics) ── */
.brk-policy-group + .brk-policy-group,
.brk-policy-list + .brk-policy-group { margin-top: clamp(36px, 4.5vw, 56px); }
.brk-policy-group-heading {
  margin: 0 0 6px;
  text-align: center;
  font-family: var(--brk-family-display, serif);
  font-weight: 500;
  font-size: clamp(22px, 2.6vw, 28px);
  letter-spacing: 0.005em;
  color: var(--brk-color-text, inherit);
}
.brk-policy-list {
  list-style: none;
  margin: 0 auto;
  padding: 0;
  max-width: 720px;
  border-top: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12));
}
.brk-policy-row {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 18px;
  padding: 30px 0;
  border-bottom: 1px solid var(--brk-color-rule, rgba(0,0,0,0.12));
  align-items: start;
}
.brk-policy-list--plain .brk-policy-row { grid-template-columns: 1fr; }
.brk-policy-mark {
  color: var(--brk-color-accent, currentColor);
  font-family: var(--brk-family-body, sans-serif);
  font-size: 13px;
  line-height: 2;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.brk-policy-title {
  margin: 0 0 10px;
  font-family: var(--brk-family-display, serif);
  font-weight: 500;
  font-size: 26px;
  letter-spacing: 0.005em;
  color: var(--brk-color-text, inherit);
}
.brk-policy-text {
  margin: 0;
  font-family: var(--brk-family-body, sans-serif);
  font-size: 15px;
  line-height: 1.75;
  white-space: pre-wrap;
  color: var(--brk-color-muted, inherit);
}

@media (prefers-reduced-motion: reduce) {
  .brk-faq summary::after,
  .brk-footer-book,
  .brk-footer-contact a { transition: none !important; }
}
`
