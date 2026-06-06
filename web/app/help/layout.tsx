import type { Metadata } from 'next'
import HelpShell from '@/components/help/HelpShell'

export const metadata: Metadata = {
  title: 'Help Center | BookReady',
  description: 'Guides for running your booking business on BookReady: your website, services, hours, bookings, customers, payments, and more.',
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <HelpShell>{children}</HelpShell>
}
