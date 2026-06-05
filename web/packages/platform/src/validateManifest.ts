/**
 * BookReady template manifest validator.
 *
 * Runs the same checks as the JSON Schema in `manifest.schema.json` but
 * pure TypeScript so it can execute in the editor, in CI, and in the
 * (eventual) marketplace submission portal without pulling in a JSON
 * Schema validator package.
 *
 * Returns a list of error messages. Empty list = valid. The submission
 * portal will reject any non-empty list before queueing for human review;
 * the editor uses the same function during development so creators see
 * the same errors locally as they will in CI.
 *
 * Keep this in lockstep with `manifest.schema.json` — any rule change
 * must land in both files.
 */

import type { HeaderField, FooterField, AboutField, TemplateManifest } from './manifest'

const ALLOWED_HEADER_FIELDS: ReadonlyArray<HeaderField> = [
  'cover_image',
  'avatar_image',
  'announcement',
  'business_type',
  'social_buttons',
]

const ALLOWED_FOOTER_FIELDS: ReadonlyArray<FooterField> = [
  'show_powered_by',
  'show_hours',
  'show_quick_book',
  'show_contact_links',
  'business_name_override',
  'subtext',
]

const ALLOWED_ABOUT_FIELDS: ReadonlyArray<AboutField> = [
  'eyebrow',
  'images',
  'highlights',
]

const SLUG_RE    = /^[a-z][a-z0-9-]{1,40}$/
const VERSION_RE = /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/
const HEX_RE     = /^#[0-9A-Fa-f]{6}$/

export interface ValidationError {
  /** Dot-path to the offending field (e.g. "color_palette[2].hex"). */
  path: string
  /** Human-readable explanation. */
  message: string
}

/**
 * Validate a manifest candidate against the marketplace contract.
 *
 * Returns an array of errors. Empty array = the manifest is valid and
 * may be loaded into the template registry. Any non-empty result is a
 * hard rejection — the submission portal will return these verbatim to
 * the creator.
 */
export function validateManifest(candidate: unknown): ValidationError[] {
  const errs: ValidationError[] = []
  if (! candidate || typeof candidate !== 'object') {
    return [{ path: '', message: 'Manifest must be a JSON object.' }]
  }
  const m = candidate as Record<string, unknown>

  // ─── slug ─────────────────────────────────────────────────────────
  if (typeof m.slug !== 'string') {
    errs.push({ path: 'slug', message: 'Required. Must be a string.' })
  } else if (! SLUG_RE.test(m.slug)) {
    errs.push({
      path: 'slug',
      message: 'Must start with a lowercase letter and contain only ' +
               'lowercase letters, digits, and hyphens (2-41 chars total).',
    })
  }

  // ─── name ─────────────────────────────────────────────────────────
  if (typeof m.name !== 'string') {
    errs.push({ path: 'name', message: 'Required. Must be a string.' })
  } else if (m.name.length < 1 || m.name.length > 60) {
    errs.push({ path: 'name', message: 'Must be 1-60 characters.' })
  }

  // ─── version ──────────────────────────────────────────────────────
  if (typeof m.version !== 'string') {
    errs.push({ path: 'version', message: 'Required. Must be a string.' })
  } else if (! VERSION_RE.test(m.version)) {
    errs.push({
      path: 'version',
      message: 'Must be semver (e.g. "1.0.0", "2.3.1-beta.1").',
    })
  }

  // ─── color_role ───────────────────────────────────────────────────
  if (m.color_role !== 'accent' && m.color_role !== 'background') {
    errs.push({
      path: 'color_role',
      message: 'Required. Must be "accent" or "background".',
    })
  }

  // ─── color_palette ────────────────────────────────────────────────
  if (! Array.isArray(m.color_palette)) {
    errs.push({
      path: 'color_palette',
      message: 'Required. Must be an array of { hex, label } entries.',
    })
  } else {
    if (m.color_palette.length < 2 || m.color_palette.length > 12) {
      errs.push({
        path: 'color_palette',
        message: 'Must contain 2-12 entries.',
      })
    }
    m.color_palette.forEach((entry, i) => {
      const path = `color_palette[${i}]`
      if (! entry || typeof entry !== 'object') {
        errs.push({ path, message: 'Each entry must be an object.' })
        return
      }
      const e = entry as Record<string, unknown>
      if (typeof e.hex !== 'string' || ! HEX_RE.test(e.hex)) {
        errs.push({
          path: `${path}.hex`,
          message: 'Required. Must be a 6-digit hex with leading # (e.g. "#FF3DBE").',
        })
      }
      if (typeof e.label !== 'string' || e.label.length < 1 || e.label.length > 40) {
        errs.push({
          path: `${path}.label`,
          message: 'Required. Must be a 1-40 character string.',
        })
      }
    })
  }

  // ─── header_fields ────────────────────────────────────────────────
  validateFieldArray(m, 'header_fields', ALLOWED_HEADER_FIELDS, errs)

  // ─── footer_fields ────────────────────────────────────────────────
  validateFieldArray(m, 'footer_fields', ALLOWED_FOOTER_FIELDS, errs)

  // ─── about_fields (optional) ──────────────────────────────────────
  if (m.about_fields !== undefined) {
    validateOptionalFieldArray(m, 'about_fields', ALLOWED_ABOUT_FIELDS, errs)
  }

  // ─── about_image_count (optional) ─────────────────────────────────
  if (m.about_image_count !== undefined) {
    const v = m.about_image_count
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 1 || v > 3 || !Number.isInteger(v)) {
      errs.push({
        path: 'about_image_count',
        message: 'Optional. Must be an integer between 1 and 3.',
      })
    }
  }

  // ─── pattern_options (optional) ───────────────────────────────────
  if (m.pattern_options !== undefined) {
    if (!Array.isArray(m.pattern_options)) {
      errs.push({
        path: 'pattern_options',
        message: 'Optional. When set, must be an array of { key, label, url } entries.',
      })
    } else {
      if (m.pattern_options.length < 1 || m.pattern_options.length > 12) {
        errs.push({ path: 'pattern_options', message: 'Must contain 1-12 entries.' })
      }
      const keys = new Set<string>()
      m.pattern_options.forEach((entry, i) => {
        const path = `pattern_options[${i}]`
        if (!entry || typeof entry !== 'object') {
          errs.push({ path, message: 'Each entry must be an object.' })
          return
        }
        const e = entry as Record<string, unknown>
        if (typeof e.key !== 'string' || !/^[a-z][a-z0-9-]{0,30}$/.test(e.key)) {
          errs.push({
            path: `${path}.key`,
            message: 'Required. Lowercase letters/digits/hyphens, 1-31 chars.',
          })
        } else if (keys.has(e.key)) {
          errs.push({ path: `${path}.key`, message: `Duplicate key "${e.key}".` })
        }
        if (typeof e.key === 'string') keys.add(e.key)
        if (typeof e.label !== 'string' || e.label.length < 1 || e.label.length > 40) {
          errs.push({
            path: `${path}.label`,
            message: 'Required. Must be a 1-40 character string.',
          })
        }
        if (typeof e.url !== 'string' || e.url.length < 1) {
          errs.push({
            path: `${path}.url`,
            message: 'Required. Asset URL (typically /templates/{slug}/{file}.{ext}).',
          })
        }
      })
    }
  }

  // ─── unknown top-level keys ───────────────────────────────────────
  const ALLOWED_TOP_LEVEL = new Set([
    'slug', 'name', 'version', 'color_role', 'color_palette',
    'header_fields', 'footer_fields',
    'about_fields', 'about_image_count',
    'pattern_options',
  ])
  Object.keys(m).forEach(k => {
    if (! ALLOWED_TOP_LEVEL.has(k)) {
      errs.push({
        path: k,
        message: 'Unknown top-level key. The marketplace contract is closed; ' +
                 'open an issue to propose new fields.',
      })
    }
  })

  return errs
}

function validateFieldArray(
  m: Record<string, unknown>,
  key: 'header_fields' | 'footer_fields',
  allowed: ReadonlyArray<string>,
  errs: ValidationError[],
): void {
  const value = m[key]
  if (! Array.isArray(value)) {
    errs.push({
      path: key,
      message: `Required. Must be an array of ${key === 'header_fields' ? 'HeaderField' : 'FooterField'} strings.`,
    })
    return
  }
  const seen = new Set<string>()
  value.forEach((entry, i) => {
    const path = `${key}[${i}]`
    if (typeof entry !== 'string') {
      errs.push({ path, message: 'Each entry must be a string.' })
      return
    }
    if (! allowed.includes(entry)) {
      errs.push({
        path,
        message: `Unknown value "${entry}". Allowed: ${allowed.join(', ')}.`,
      })
    }
    if (seen.has(entry)) {
      errs.push({ path, message: `Duplicate entry "${entry}".` })
    }
    seen.add(entry)
  })
}

function validateOptionalFieldArray(
  m: Record<string, unknown>,
  key: 'about_fields',
  allowed: ReadonlyArray<string>,
  errs: ValidationError[],
): void {
  const value = m[key]
  if (! Array.isArray(value)) {
    errs.push({
      path: key,
      message: `Optional. When set, must be an array of ${key === 'about_fields' ? 'AboutField' : 'string'} values.`,
    })
    return
  }
  const seen = new Set<string>()
  value.forEach((entry, i) => {
    const path = `${key}[${i}]`
    if (typeof entry !== 'string') {
      errs.push({ path, message: 'Each entry must be a string.' })
      return
    }
    if (! allowed.includes(entry)) {
      errs.push({
        path,
        message: `Unknown value "${entry}". Allowed: ${allowed.join(', ')}.`,
      })
    }
    if (seen.has(entry)) {
      errs.push({ path, message: `Duplicate entry "${entry}".` })
    }
    seen.add(entry)
  })
}

/**
 * Convenience: returns `null` on valid manifest, or a formatted error
 * string suitable for `throw new Error(...)`.
 */
export function assertValidManifest(candidate: unknown): TemplateManifest {
  const errs = validateManifest(candidate)
  if (errs.length === 0) return candidate as TemplateManifest
  const lines = errs.map(e => `  - ${e.path || '<root>'}: ${e.message}`).join('\n')
  throw new Error(`Invalid template manifest:\n${lines}`)
}
