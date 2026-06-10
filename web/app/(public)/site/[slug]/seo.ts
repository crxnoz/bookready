import type { PublicSite, BusinessProfile, HoursEntry } from '@/lib/types'

/**
 * SEO helpers for tenant booking sites.
 *
 * Everything here runs at build / request time inside `page.tsx` and
 * the sibling sitemap.xml / robots.txt route handlers. Keeping them
 * separate from the page component keeps the component lean and
 * makes the helpers unit-testable in isolation.
 *
 * Coverage goals:
 *  1. Search snippet that reads like a human wrote it (not Google's
 *     guess at "first paragraph"). buildSiteDescription().
 *  2. schema.org JSON-LD so Google understands the page is a real
 *     local business — populates Maps, Knowledge Panel cards, and
 *     "near me" ranking signals. buildLocalBusinessSchema().
 *  3. The right @type per vertical so Google indexes us under the
 *     correct category. resolveBusinessSchemaType().
 *
 * Every helper is defensive: missing profile / missing fields / wrong
 * data degrade gracefully. We never emit invalid JSON-LD or partially
 * filled tags that would fail validation in Search Console.
 */

const BASE_DOMAIN = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? 'bkrdy.me'

const SCHEMA_DAYS: Record<number, string> = {
  0: 'https://schema.org/Sunday',
  1: 'https://schema.org/Monday',
  2: 'https://schema.org/Tuesday',
  3: 'https://schema.org/Wednesday',
  4: 'https://schema.org/Thursday',
  5: 'https://schema.org/Friday',
  6: 'https://schema.org/Saturday',
}

/**
 * Pick the most-specific schema.org @type the BusinessProfile.business_type
 * field warrants. Falls through to LocalBusiness when the type field
 * is empty or unrecognized — Google ranks LocalBusiness for any service
 * business, so that's a safe default.
 *
 * Naming tip when adding new mappings: pick a value from the schema.org
 * docs at https://schema.org/LocalBusiness#hierarchy. Don't invent
 * new types — Google ignores anything not in the official list.
 */
export function resolveBusinessSchemaType(rawType: string | null | undefined): string {
  if (!rawType) return 'LocalBusiness'
  const t = rawType.toLowerCase()

  // Order matters: check for the more specific term first when terms
  // share substrings (e.g. "hair salon" before "salon").
  if (t.includes('barber'))            return 'BarberShop'
  if (t.includes('hair') && t.includes('salon')) return 'HairSalon'
  if (t.includes('nail'))              return 'NailSalon'
  if (t.includes('day spa') || t.includes('spa') && t.includes('day')) return 'DaySpa'
  if (t.includes('spa'))               return 'DaySpa'
  if (t.includes('tattoo'))            return 'TattooParlor'
  if (t.includes('lash')
      || t.includes('brow')
      || t.includes('makeup')
      || t.includes('aesthetic')
      || t.includes('medspa')
      || t.includes('beauty'))         return 'BeautySalon'
  if (t.includes('massage'))           return 'HealthAndBeautyBusiness'

  return 'HealthAndBeautyBusiness'
}

/**
 * Search snippet for the tenant homepage. Used both for
 * <meta name="description"> and the open-graph + twitter card.
 *
 * Pattern:
 *   "{Tagline}. Book online with {Business} in {City}, {State}."
 *
 * Falls back to a generic but on-brand line when fields are missing so
 * we always emit a description (a missing description tag makes Google
 * synthesize from page content, which is worse).
 */
export function buildSiteDescription(site: PublicSite): string {
  const p             = site.profile ?? null
  const displayName   = p?.business_name ?? site.business_name ?? site.slug
  const city          = p?.city?.trim()
  const state         = p?.state?.trim()
  const tagline       = p?.tagline?.trim()
  const locationPhrase = [city, state].filter(Boolean).join(', ')

  if (tagline) {
    // Strip trailing punctuation so we can chain a second sentence cleanly.
    const cleanTagline = tagline.replace(/[.!?,;:]+$/, '')
    return locationPhrase
      ? `${cleanTagline}. Book online with ${displayName} in ${locationPhrase}.`
      : `${cleanTagline}. Book online with ${displayName}.`
  }

  return locationPhrase
    ? `Book your next appointment with ${displayName} in ${locationPhrase}. Online booking, instant confirmation, easy reschedule.`
    : `Book your next appointment with ${displayName}. Online booking, instant confirmation, easy reschedule.`
}

/**
 * Build a schema.org LocalBusiness JSON-LD object for the tenant.
 *
 * Returns null when the site isn't safe to schema-tag — locked /
 * coming-soon / 404. Callers should only inject the script when a
 * non-null object comes back; an empty object would fail Google's
 * validator.
 *
 * Fields populated when available:
 *   - @id + url      → canonical subdomain URL
 *   - name           → business_name
 *   - description    → tagline (when present)
 *   - telephone      → public_phone
 *   - email          → public_email
 *   - address        → PostalAddress sub-object (assumes US for v1)
 *   - openingHoursSpecification → from site.hours
 *   - sameAs         → array of social URLs (instagram_url today;
 *                      add Facebook + TikTok here when those columns land)
 *   - priceRange     → '$' (could be owner-driven later)
 *   - image          → not yet (no profile image column — wire when added)
 *
 * Schema reference: https://schema.org/LocalBusiness
 * Google's required + recommended properties for LocalBusiness rich
 * results: https://developers.google.com/search/docs/appearance/structured-data/local-business
 */
export function buildLocalBusinessSchema(site: PublicSite): Record<string, unknown> | null {
  if (site.status !== 'active') return null

  const p = site.profile ?? null
  const displayName = p?.business_name ?? site.business_name ?? site.slug
  if (!displayName) return null

  const url = `https://${site.slug}.${BASE_DOMAIN}/`

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type':    resolveBusinessSchemaType(p?.business_type),
    '@id':      url,
    name:       displayName,
    url,
    priceRange: '$',
  }

  if (p?.tagline)      schema.description = p.tagline.replace(/[.!?,;:]+$/, '')
  if (p?.public_phone) schema.telephone   = p.public_phone
  if (p?.public_email) schema.email       = p.public_email

  const address = buildPostalAddress(p)
  if (address) schema.address = address

  const hours = buildOpeningHours(site.hours)
  if (hours.length) schema.openingHoursSpecification = hours

  const sameAs: string[] = []
  if (p?.instagram_url) sameAs.push(p.instagram_url)
  if (sameAs.length) schema.sameAs = sameAs

  return schema
}

function buildPostalAddress(p: BusinessProfile | null): Record<string, unknown> | null {
  if (!p) return null
  const fields = {
    streetAddress:   p.address_line?.trim() || null,
    addressLocality: p.city?.trim() || null,
    addressRegion:   p.state?.trim() || null,
    postalCode:      p.zip?.trim() || null,
  }
  // Skip PostalAddress entirely if nothing meaningful exists. Google
  // bumps the rich-result eligibility down if address fields are empty
  // strings; cleaner to omit the object.
  if (! Object.values(fields).some(Boolean)) return null

  const address: Record<string, unknown> = {
    '@type': 'PostalAddress',
    addressCountry: 'US',
  }
  if (fields.streetAddress)   address.streetAddress   = fields.streetAddress
  if (fields.addressLocality) address.addressLocality = fields.addressLocality
  if (fields.addressRegion)   address.addressRegion   = fields.addressRegion
  if (fields.postalCode)      address.postalCode      = fields.postalCode
  return address
}

function buildOpeningHours(hours: HoursEntry[] | undefined): Record<string, unknown>[] {
  if (! hours) return []
  return hours
    .filter(h => h.is_open && h.open_time && h.close_time && SCHEMA_DAYS[h.day_of_week])
    .map(h => ({
      '@type':   'OpeningHoursSpecification',
      dayOfWeek: SCHEMA_DAYS[h.day_of_week]!,
      opens:     h.open_time,
      closes:    h.close_time,
    }))
}
