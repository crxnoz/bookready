/**
 * PolicySection — shared, theme-tokenized "good to know" policy ledger.
 *
 * Renders the canonical `.brk-section` + `.brk-policy-*` markup styled by
 * SECTIONS_CSS against the canonical theme tokens. Takes a flat list of
 * label/body rows (the standard cancellation / late / no-show / deposit /
 * reschedule / guest policies) plus optional `customGroups` rendered under
 * their own subheadings.
 *
 * Each row may carry a leading marker (`marker`): a glyph (◆ by default), a
 * zero-padded ordinal, or none — the list grid drops its marker column in the
 * 'none' case via a `--plain` modifier (mirrors InstructionsSection). The look
 * is Opaline's neutral base (hairline-divided rows, no boxes); templates skin
 * via `.brk-policy*`.
 *
 * Returns null when there are no rows and no customGroups, unless an
 * `emptyText` is given (then the header + a `.brk-empty` hint render).
 */
export interface PolicyRow {
  label: string
  body?: string | null
}

export interface PolicyGroup {
  heading: string
  items: { title?: string | null; content?: string | null }[]
}

export interface PolicySectionProps {
  rows: PolicyRow[] | null | undefined
  customGroups?: PolicyGroup[] | null
  heading?: string
  eyebrow?: string
  /** Per-row leading marker style. 'none' drops the marker column. */
  marker?: 'none' | 'glyph' | 'numeral'
  /** Glyph used when marker='glyph'. Default ◆. */
  markGlyph?: string
  /** Placeholder shown (with the header) when there is nothing to show. */
  emptyText?: string
  ariaLabel?: string
}

export function PolicySection({
  rows,
  customGroups,
  heading = 'Good to Know',
  eyebrow = 'Policies',
  marker = 'none',
  markGlyph = '◆',
  emptyText,
  ariaLabel,
}: PolicySectionProps) {
  const validRows = (rows ?? []).filter(r => (r.body ?? '').trim())
  const validGroups = (customGroups ?? [])
    .map(g => ({
      heading: g.heading,
      items: (g.items ?? []).filter(it => (it.title ?? '').trim() || (it.content ?? '').trim()),
    }))
    .filter(g => g.items.length > 0)

  if (validRows.length === 0 && validGroups.length === 0 && !emptyText) return null

  const showMark = marker !== 'none'
  const listClass = `brk-policy-list${showMark ? ' brk-policy-list--marked' : ' brk-policy-list--plain'}`

  const renderMark = (i: number) =>
    !showMark ? null : (
      <span className="brk-policy-mark" aria-hidden="true">
        {marker === 'numeral' ? String(i + 1).padStart(2, '0') : markGlyph}
      </span>
    )

  return (
    <section className="brk-section brk-policy-section" aria-label={ariaLabel ?? heading}>
      <header className="brk-section-head">
        {eyebrow && <p className="brk-eyebrow">{eyebrow}</p>}
        {heading && <h2 className="brk-section-title">{heading}</h2>}
      </header>
      {validRows.length === 0 && validGroups.length === 0 ? (
        <p className="brk-empty">{emptyText}</p>
      ) : (
        <>
          {validRows.length > 0 && (
            <ul className={listClass}>
              {validRows.map((r, i) => (
                <li key={i} className="brk-policy-row">
                  {renderMark(i)}
                  <div className="brk-policy-body">
                    <h3 className="brk-policy-title">{r.label}</h3>
                    <p className="brk-policy-text">{r.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {validGroups.map((g, gi) => (
            <div key={`g${gi}`} className="brk-policy-group">
              <h3 className="brk-policy-group-heading">{g.heading}</h3>
              <ul className={listClass}>
                {g.items.map((it, ii) => (
                  <li key={ii} className="brk-policy-row">
                    {renderMark(ii)}
                    <div className="brk-policy-body">
                      {(it.title ?? '').trim() && <h3 className="brk-policy-title">{it.title}</h3>}
                      {(it.content ?? '').trim() && <p className="brk-policy-text">{it.content}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  )
}

export default PolicySection
