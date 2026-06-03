/**
 * ThanksSection — shared, theme-tokenized closing "thank you" band.
 *
 * Centered eyebrow / title / body / signature. Renders only when enabled
 * and a title is set (matches the per-template gate). Signature falls back
 * to the business name when not overridden.
 */
export interface ThanksSectionProps {
  /** additionals.show_thank_you — section hidden when explicitly false. */
  show?: boolean
  title?: string | null
  body?: string | null
  signature?: string | null
  /** Used when no signature is set — typically the business name. */
  fallbackSignature: string
  eyebrow?: string
  ariaLabel?: string
}

export function ThanksSection({
  show = true,
  title,
  body,
  signature,
  fallbackSignature,
  eyebrow = 'With Gratitude',
  ariaLabel = 'Thank you',
}: ThanksSectionProps) {
  if (show === false || !(title ?? '').trim()) return null
  const sig = (typeof signature === 'string' && signature.trim())
    ? signature.trim()
    : fallbackSignature

  return (
    <section className="brk-section brk-thanks" aria-label={ariaLabel}>
      <p className="brk-eyebrow">{eyebrow}</p>
      <h2 className="brk-thanks-title">{title}</h2>
      {(body ?? '').trim() && <p className="brk-thanks-body">{body}</p>}
      <p className="brk-thanks-sign">&mdash; {sig}</p>
    </section>
  )
}

export default ThanksSection
