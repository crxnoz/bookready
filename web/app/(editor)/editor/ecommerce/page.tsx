'use client'

import EditorShell from '@/components/editor/EditorShell'
import { ComingSoonPanel } from '@/components/editor/ComingSoonPanel'
import { ShoppingBag, Gift, Package, BarChart3 } from 'lucide-react'

/**
 * Ecommerce — top-level "soon" section. Pure teaser via the shared
 * ComingSoonPanel; nothing here hits the backend yet.
 */
export default function EcommercePage() {
  return (
    <EditorShell>
      <div className="w-full p-3 sm:p-5 md:p-6">
        <ComingSoonPanel
          eyebrow="Coming Soon"
          title="Ecommerce"
          intro="Sell products, gift cards, and service bundles right beside your booking flow. Everything gets paid through the same Stripe account you already use, so there is nothing new to connect."
          features={[
            {
              icon:        ShoppingBag,
              tone:        'accent',
              title:       'Product catalog',
              description: 'List retail products with photos, prices, and stock. Customers can add them to a booking or buy them on their own.',
              bullets: [
                'Add-to-booking upsells at checkout',
                'Simple stock tracking with low-stock alerts',
                'Pickup at appointment or standalone purchase',
              ],
            },
            {
              icon:        Gift,
              title:       'Gift cards',
              description: 'Sell digital gift cards customers can send to anyone and redeem at booking checkout.',
              bullets: [
                'Preset or custom amounts',
                'Balances tracked automatically across visits',
                'Delivered by email with your branding',
              ],
            },
            {
              icon:        Package,
              title:       'Service packages',
              description: 'Bundle sessions at a package price. Customers pay once up front and book each visit when they are ready.',
              bullets: [
                'Remaining sessions tracked per customer',
                'Optional expiry window per package',
                'Redeem straight from the booking flow',
              ],
            },
            {
              icon:        BarChart3,
              title:       'Sales insights',
              description: 'See what sells, who buys, and how product revenue stacks up against bookings over time.',
              bullets: [
                'Revenue split across products, gift cards, and packages',
                'Top sellers and repeat buyers at a glance',
                'Payouts land in your existing Stripe account',
              ],
            },
          ]}
        />
      </div>
    </EditorShell>
  )
}
