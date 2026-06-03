/**
 * InstructionsSection — shared, theme-tokenized "list of steps/notes" section.
 *
 * Serves BOTH the Advice and Timeline sections (same data shape:
 * heading + optional card_kicker + items[{title,body}]):
 *   - numbered=false (Advice) → a `markGlyph` (e.g. ◆ / ✦) per row.
 *   - numbered=true  (Timeline) → a zero-padded ordinal (01, 02…) per row.
 *
 * Unlike the standalone sections, these render inside a tab panel, so an
 * `emptyText` placeholder is supported (the tab still shows its header +
 * a hint when there are no items). Without `emptyText` it returns null.
 *
 * Per-template flourishes (spine, alternating nodes, sticky-note tilt, ✦
 * separators) live in each template's `.{tpl}-template .brk-instruction*`
 * skin over this base.
 */
export interface InstructionItem {
  title?: string | null
  body?: string | null
}

export interface InstructionsSectionProps {
  items: InstructionItem[] | null | undefined
  heading?: string
  eyebrow?: string
  cardKicker?: string | null
  /** true → ordinal nodes (Timeline); false → markGlyph (Advice). */
  numbered?: boolean
  /** Glyph for the un-numbered marker. */
  markGlyph?: string
  /** Un-numbered only: set false to drop the marker column entirely
   *  (for templates whose advice list has no per-item glyph). */
  showMark?: boolean
  /** Placeholder shown (with the header) when there are no items. */
  emptyText?: string
  ariaLabel?: string
}

export function InstructionsSection({
  items,
  heading,
  eyebrow,
  cardKicker,
  numbered = false,
  markGlyph = '◆',
  showMark = true,
  emptyText,
  ariaLabel,
}: InstructionsSectionProps) {
  const valid = (items ?? []).filter(
    it => (it.title ?? '').trim() || (it.body ?? '').trim(),
  )
  if (valid.length === 0 && !emptyText) return null

  const Tag = numbered ? 'ol' : 'ul'
  const renderMark = numbered || showMark !== false
  const listVariant = numbered
    ? ' brk-instructions--numbered'
    : (showMark === false ? ' brk-instructions--plain' : '')

  return (
    <section className="brk-section brk-instructions-section" aria-label={ariaLabel ?? heading}>
      <header className="brk-section-head">
        {eyebrow && <p className="brk-eyebrow">{eyebrow}</p>}
        {heading && <h2 className="brk-section-title">{heading}</h2>}
      </header>
      {valid.length === 0 ? (
        <p className="brk-empty">{emptyText}</p>
      ) : (
        <Tag className={`brk-instructions${listVariant}`}>
          {valid.map((it, i) => (
            <li key={i} className="brk-instruction">
              {renderMark && (
                <span className="brk-instruction-mark" aria-hidden="true">
                  {numbered ? String(i + 1).padStart(2, '0') : markGlyph}
                </span>
              )}
              <div className="brk-instruction-body">
                {(cardKicker ?? '').trim() && <span className="brk-instruction-kicker">{cardKicker}</span>}
                {(it.title ?? '').trim() && <h3>{it.title}</h3>}
                {(it.body ?? '').trim() && <p>{it.body}</p>}
              </div>
            </li>
          ))}
        </Tag>
      )}
    </section>
  )
}

export default InstructionsSection
