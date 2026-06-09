/**
 * BookReady UI guardrails — editor scope only.
 *
 * HARD FAIL (exit 1): any `rounded-*` class — enforces the SHARP ruling.
 * WARN (tracked, non-failing): inline hex + arbitrary `text-[Npx]`, which
 *   the cohesion sweep's later phases (tokens + section adoption) clear.
 *
 * Run: `npm run check:ui`  (from web/). Public templates are intentionally
 * out of scope — they keep their own per-template aesthetic.
 *
 * Per-line exemption: mark a violation as intentional with
 *
 *     // ui-guardrails: allow-rounded — short reason
 *
 * placed on the same line OR within 2 lines ABOVE the offending line. The
 * 2-line lookback exists because JSX className attributes can't carry an
 * inline comment between attributes — the closest a developer can put the
 * directive is on the JSX element's opening line or the wrapping
 * conditional. `/* … *\/` block-comment form is also accepted.
 *
 * Use exemptions only for things that are genuinely a CHOICE — e.g. the
 * round color-category swatches in ServicesEditor that read as "color dot"
 * to every owner who has ever used the app. Default is SHARP.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOTS = ['components/editor', 'components/app', 'components/ui', 'app/(editor)']
const EXT = new Set(['.ts', '.tsx'])

const HARD    = /\brounded-(?:full|sm|md|lg|xl|2xl|3xl|none)\b|\brounded-\[/g
const TEXTPX  = /text-\[\d+px\]/g
// className arbitrary hex only (e.g. text-[#abc123]). Excludes inline-style
// + SVG fills + documented domain palettes (calendar legend, charts).
const HEX     = /-\[#[0-9a-fA-F]{6}/g
// off-system Tailwind default palette utilities (should be design tokens)
const PALETTE = /\b(?:text|bg|border|ring|from|via|to|fill|stroke|divide)-(?:red|green|blue|amber|yellow|orange|emerald|teal|rose|pink|sky|indigo|violet|purple|lime|cyan)-(?:50|100|200|300|400|500|600|700|800|900)\b/g

// Directive form. Matches both `// ui-guardrails: allow-rounded …`
// and `/* ui-guardrails: allow-rounded … */`. Reason text is optional.
const ALLOW_ROUNDED = /ui-guardrails:\s*allow-rounded\b/

function walk(dir, files = []) {
  let entries
  try { entries = readdirSync(dir) } catch { return files }
  for (const e of entries) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, files)
    else if (EXT.has(extname(p))) files.push(p)
  }
  return files
}

/**
 * Look at the line at `idx` plus up to `LOOKBACK` lines above for the
 * exemption directive. The lookback covers nested JSX patterns:
 *
 *     {/* ui-guardrails: allow-rounded — color swatch *\/}    <-- directive
 *     {group.color && (
 *       <span
 *         aria-hidden
 *         className="rounded-full"                                <-- violation
 *
 * That's 4 lines apart in the worst real case (ServicesEditor). 5 leaves
 * a one-line cushion for variations (e.g. an extra wrapping div above).
 * For pure TS / utility files the directive sits on the same line.
 */
const LOOKBACK = 5
function isExempt(lines, idx) {
  const start = Math.max(0, idx - LOOKBACK)
  for (let i = start; i <= idx; i++) {
    if (ALLOW_ROUNDED.test(lines[i])) return true
  }
  return false
}

const hard = []
const exempted = []
let textpx = 0
let hex = 0
let palette = 0

for (const root of ROOTS) {
  for (const f of walk(root)) {
    const src = readFileSync(f, 'utf8')
    const lines = src.split('\n')
    lines.forEach((line, i) => {
      const m = line.match(HARD)
      if (!m) return
      if (isExempt(lines, i)) {
        exempted.push(`${f}:${i + 1}  ${m.join(' ')}`)
        return
      }
      hard.push(`${f}:${i + 1}  ${m.join(' ')}`)
    })
    textpx  += (src.match(TEXTPX) || []).length
    hex     += (src.match(HEX) || []).length
    palette += (src.match(PALETTE) || []).length
  }
}

console.log('UI guardrails — editor scope')
console.log(`  rounded-* classes (HARD):  ${hard.length}`)
console.log(`  rounded-* exempted:        ${exempted.length}   <- /* ui-guardrails: allow-rounded */`)
console.log(`  text-[Npx]      (warn):    ${textpx}   <- type tokens`)
console.log(`  inline #hex     (warn):    ${hex}   <- color tokens`)
console.log(`  TW palette util (warn):    ${palette}   <- status/color tokens`)

if (exempted.length) {
  console.log('\nExempted (annotated):')
  for (const e of exempted) console.log('  ' + e)
}

if (hard.length) {
  console.log('\nSHARP violations (must be 0):')
  for (const h of hard) console.log('  ' + h)
  process.exit(1)
}
console.log('\nOK — sharp invariant holds.')
