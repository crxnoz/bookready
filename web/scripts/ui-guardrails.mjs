/**
 * BookReady UI guardrails — editor scope only.
 *
 * HARD FAIL (exit 1): any `rounded-*` class — enforces the SHARP ruling.
 * WARN (tracked, non-failing): inline hex + arbitrary `text-[Npx]`, which
 *   the cohesion sweep's later phases (tokens + section adoption) clear.
 *
 * Run: `npm run check:ui`  (from web/). Public templates are intentionally
 * out of scope — they keep their own per-template aesthetic.
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

const hard = []
let textpx = 0
let hex = 0
let palette = 0

for (const root of ROOTS) {
  for (const f of walk(root)) {
    const src = readFileSync(f, 'utf8')
    src.split('\n').forEach((line, i) => {
      const m = line.match(HARD)
      if (m) hard.push(`${f}:${i + 1}  ${m.join(' ')}`)
    })
    textpx  += (src.match(TEXTPX) || []).length
    hex     += (src.match(HEX) || []).length
    palette += (src.match(PALETTE) || []).length
  }
}

console.log('UI guardrails — editor scope')
console.log(`  rounded-* classes (HARD):  ${hard.length}`)
console.log(`  text-[Npx]      (warn):    ${textpx}   <- type tokens`)
console.log(`  inline #hex     (warn):    ${hex}   <- color tokens`)
console.log(`  TW palette util (warn):    ${palette}   <- status/color tokens`)

if (hard.length) {
  console.log('\nSHARP violations (must be 0):')
  for (const h of hard) console.log('  ' + h)
  process.exit(1)
}
console.log('\nOK — sharp invariant holds.')
