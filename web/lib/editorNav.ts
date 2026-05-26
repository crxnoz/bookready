/**
 * Single source of truth for the editor's section + sub-nav structure.
 *
 * Each top-level section in the sidebar (Website / Bookings / Customers /
 * Payments / Settings) has:
 *   - a hub path
 *   - a list of path prefixes that identify pages belonging to it
 *   - an inner nav strip (config-driven, rendered by EditorInnerNav)
 *
 * Two nav modes coexist for now because the codebase started that way and
 * we don't want to renumber URLs:
 *   - 'query-tab' — same path, tab selected via ?tab=... (Website, Settings, Payments)
 *   - 'route'     — separate routes per tab           (Bookings sub-pages)
 */

import {
  LayoutDashboard, Info, Sparkles, FileText, Image as ImageIcon,
  Shield, Plus, Settings as SettingsIcon, Search,
} from 'lucide-react'

export type EditorSectionKey =
  | 'dashboard'
  | 'website'
  | 'bookings'
  | 'customers'
  | 'payments'
  | 'settings'

export type InnerNavMode = 'query-tab' | 'route'

export interface InnerNavItem {
  /** Tab identifier (used as the ?tab= value for query-tab mode) */
  id: string
  label: string
  /** Optional Lucide icon shown before the label */
  icon?: React.ElementType
  /** Optional: full path override (route mode), or for routes that aren't `{hub}?tab={id}` */
  href?: string
  /** Optional soon/preview marker; the tab still renders but is visibly muted */
  soon?: boolean
}

export interface EditorSectionConfig {
  key:           EditorSectionKey
  label:         string         // Section name shown at top + in sidebar
  hubPath:       string         // /editor/website etc.
  pathPrefixes:  string[]       // Any pages that belong to this section
  innerNavMode:  InnerNavMode
  innerNav:      InnerNavItem[]
  defaultTitle:    string
  defaultSubtitle: string
}

// ── Section configs ─────────────────────────────────────────────────────────

export const EDITOR_SECTIONS: EditorSectionConfig[] = [
  {
    key:          'dashboard',
    label:        'Dashboard',
    hubPath:      '/editor',
    pathPrefixes: ['/editor'],            // Note: matched last so other sections win
    innerNavMode: 'query-tab',
    innerNav:     [],                     // Dashboard has no inner nav
    defaultTitle:    'Dashboard',
    defaultSubtitle: 'Snapshot of your business — appointments, site status, and quick actions.',
  },
  {
    key:          'website',
    label:        'Website',
    hubPath:      '/editor/website',
    pathPrefixes: ['/editor/website', '/editor/branding', '/editor/template'],
    innerNavMode: 'query-tab',
    innerNav: [
      // Before & After merged into Gallery; user can manage both lists from
      // a single 'gallery' tab. Keys for everything else stay stable so
      // bookmarks + deep-links keep working. Icons intentionally omitted —
      // text labels alone read cleaner in this nav.
      { id: 'overview',     label: 'Overview' },
      { id: 'header',       label: 'Hero' },
      { id: 'content',      label: 'Content' },
      { id: 'gallery',      label: 'Gallery' },
      { id: 'policies',     label: 'Policies' },
      { id: 'additionals',  label: 'Additionals' },
      { id: 'footer',       label: 'Footer' },
      { id: 'seo',          label: 'SEO',           soon: true },
    ],
    defaultTitle:    'Website',
    defaultSubtitle: 'Manage your public site, template content, galleries, and brand details.',
  },
  {
    key:          'bookings',
    label:        'Bookings',
    hubPath:      '/editor/bookings',
    pathPrefixes: ['/editor/bookings', '/editor/services', '/editor/availability', '/editor/hours', '/editor/appointments', '/editor/staff'],
    innerNavMode: 'route',
    innerNav: [
      { id: 'overview',      label: 'Overview',      href: '/editor/bookings' },
      { id: 'services',      label: 'Services',      href: '/editor/services' },
      { id: 'availability',  label: 'Availability',  href: '/editor/availability' },
      { id: 'appointments',  label: 'Appointments',  href: '/editor/appointments' },
      { id: 'staff',         label: 'Staff',         href: '/editor/staff' },
      { id: 'rules',         label: 'Booking Rules', href: '/editor/bookings?tab=rules', soon: true },
    ],
    defaultTitle:    'Bookings',
    defaultSubtitle: 'Services, availability, appointments, staff, and booking rules.',
  },
  {
    key:          'customers',
    label:        'Customers',
    hubPath:      '/editor/customers',
    pathPrefixes: ['/editor/customers'],
    innerNavMode: 'query-tab',
    innerNav: [
      { id: 'overview', label: 'Overview' },
      { id: 'list',     label: 'Customers' },
      { id: 'segments', label: 'Segments', soon: true },
      { id: 'notes',    label: 'Notes',    soon: true },
    ],
    defaultTitle:    'Customers',
    defaultSubtitle: 'Your client list, contact details, and booking history.',
  },
  {
    key:          'payments',
    label:        'Payments',
    hubPath:      '/editor/payments',
    pathPrefixes: ['/editor/payments'],
    innerNavMode: 'query-tab',
    innerNav: [
      { id: 'overview',     label: 'Overview' },
      { id: 'deposits',     label: 'Deposits' },
      { id: 'transactions', label: 'Transactions', soon: true },
      { id: 'payouts',      label: 'Payouts',      soon: true },
      { id: 'settings',     label: 'Settings',     href: '/editor/settings?tab=payments' },
    ],
    defaultTitle:    'Payments',
    defaultSubtitle: 'Track deposits, balances, and customer payment activity.',
  },
  {
    key:          'settings',
    label:        'Settings',
    hubPath:      '/editor/settings',
    pathPrefixes: ['/editor/settings'],
    innerNavMode: 'query-tab',
    innerNav: [
      { id: 'overview',      label: 'Overview' },
      { id: 'business',      label: 'Business' },
      { id: 'booking',       label: 'Booking' },
      { id: 'payments',      label: 'Payments' },
      { id: 'notifications', label: 'Notifications' },
      { id: 'policies',      label: 'Policies' },
      { id: 'account',       label: 'Account' },
      { id: 'integrations',  label: 'Integrations' },
      { id: 'danger',        label: 'Danger Zone' },
    ],
    defaultTitle:    'Settings',
    defaultSubtitle: 'Business-wide settings: payments, notifications, integrations, and account.',
  },
]

/**
 * Resolve the section a given pathname belongs to. Skips 'dashboard' until
 * everything else has been ruled out so the bare /editor route stays
 * dashboard but /editor/website properly identifies as website.
 */
export function sectionForPath(path: string): EditorSectionConfig {
  for (const s of EDITOR_SECTIONS) {
    if (s.key === 'dashboard') continue
    if (s.pathPrefixes.some(p => path === p || path.startsWith(p + '/'))) {
      return s
    }
  }
  return EDITOR_SECTIONS.find(s => s.key === 'dashboard')!
}

export function hrefForInnerTab(section: EditorSectionConfig, item: InnerNavItem): string {
  if (item.href) return item.href
  if (section.innerNavMode === 'query-tab') {
    return item.id === 'overview' ? section.hubPath : `${section.hubPath}?tab=${item.id}`
  }
  return section.hubPath
}
