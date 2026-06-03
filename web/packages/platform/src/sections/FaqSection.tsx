/**
 * FaqSection — shared, theme-tokenized FAQ accordion.
 *
 * Renders the canonical `.brk-section` + `.brk-faq-*` markup styled by
 * SECTIONS_CSS against the canonical theme tokens. Tolerates both the
 * `{question, answer}` and legacy `{q, a}` item shapes, and filters out
 * empty entries. Returns null when there's nothing to show, so callers can
 * gate only on the section's `enabled` flag.
 *
 * The first BookReady template-platform section to be extracted from the
 * per-template bespoke renders (proof of the shared-section model). The look
 * comes entirely from the consuming template's theme tokens; a template may
 * add signature flourishes via its own scoped CSS over `.brk-faq`.
 */
export interface FaqItem {
  question?: string
  answer?: string
  /** Legacy aliases. */
  q?: string
  a?: string
}

export interface FaqSectionProps {
  items: FaqItem[] | null | undefined
  heading?: string
  eyebrow?: string
  /** Accessible label for the <section>. */
  ariaLabel?: string
}

export function FaqSection({
  items,
  heading = 'Frequently asked',
  eyebrow = 'Questions',
  ariaLabel = 'FAQ',
}: FaqSectionProps) {
  const valid = (items ?? []).filter(
    f => (f.question ?? f.q ?? '').trim() && (f.answer ?? f.a ?? '').trim(),
  )
  if (valid.length === 0) return null

  return (
    <section className="brk-section brk-faq-section" aria-label={ariaLabel}>
      <header className="brk-section-head">
        <p className="brk-eyebrow">{eyebrow}</p>
        <h2 className="brk-section-title">{heading}</h2>
      </header>
      <div className="brk-faq-list">
        {valid.map((f, i) => (
          <details key={i} className="brk-faq">
            <summary>{f.question ?? f.q}</summary>
            <p>{f.answer ?? f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export default FaqSection
