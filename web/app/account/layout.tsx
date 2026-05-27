import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BookReady Account',
  description: 'Manage your BookReady bookings and account.',
}

/**
 * Phase 4 of the customer-accounts feature — top-level shell for the
 * entire /account/* surface.
 *
 * Intentionally minimal: per-page layouts (AuthShell for unauthed
 * pages, AccountShell for authed pages) own their own structure. This
 * layout just sets the metadata + provides a clean mount point.
 */
export default function AccountRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
