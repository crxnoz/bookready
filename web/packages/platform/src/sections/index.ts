/**
 * @bkrdy/platform/sections — shared, theme-tokenized section components.
 *
 * The render-layer counterpart to the shared booking module. Templates
 * inject SECTIONS_CSS once, bridge their palette onto the canonical theme
 * tokens (see theme.ts), then compose these components instead of
 * hand-rolling each section. Signature flourishes go in the template's own
 * scoped CSS over the `.brk-*` classes.
 *
 * Status: incremental extraction. FaqSection is the first section moved here
 * (proof of the model); more follow in similarity order — see
 * web/templates/ARCHITECTURE.md.
 */

export * from './theme'
export { SECTIONS_CSS } from './sectionsCss'
export { FaqSection } from './FaqSection'
export type { FaqItem, FaqSectionProps } from './FaqSection'
export { ReviewsSection } from './ReviewsSection'
export type { ReviewItem, ReviewsSectionProps } from './ReviewsSection'
export { ThanksSection } from './ThanksSection'
export type { ThanksSectionProps } from './ThanksSection'
export { SiteFooter } from './SiteFooter'
export type { FooterHoursRow, SiteFooterProps } from './SiteFooter'
