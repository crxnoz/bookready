'use client'

import { useSearchParams } from 'next/navigation'
import EditorShell from '@/components/editor/EditorShell'
import CustomersEditor from '@/components/editor/CustomersEditor'
import { ComingSoonPanel } from '@/components/editor/ComingSoonPanel'
import {
  Gift, Star, Sparkles, MessageSquare, Award, Crown,
  Mail as MailIcon,
} from 'lucide-react'

/**
 * Customers page — defaults to the live customer list. Three soon-marked
 * tabs (Loyalty Rewards, Customer Accounts, Reviews) render their own
 * teaser panels via the shared ComingSoonPanel component.
 */
export default function CustomersPage() {
  const sp  = useSearchParams()
  const tab = sp?.get('tab') ?? 'overview'

  if (tab === 'loyalty')  return <Shell><LoyaltyPanel /></Shell>
  if (tab === 'reviews')  return <Shell><ReviewsPanel /></Shell>

  return <Shell><CustomersEditor /></Shell>
}

function Shell({ children }: { children: React.ReactNode }) {
  return <EditorShell>{children}</EditorShell>
}

function LoyaltyPanel() {
  return (
    <div className="w-full p-3 sm:p-5 md:p-6">
      <ComingSoonPanel
        eyebrow="Coming Soon"
        title="Loyalty Rewards"
        intro="Turn one-time bookings into repeat visits. Reward customers for showing up, referring friends, and trying new services, all on autopilot."
        features={[
          {
            icon:        Award,
            tone:        'accent',
            title:       'Visit-based punch card',
            description: 'Auto-stamp each completed appointment. Reward the Nth visit with a free service, add-on, or discount.',
            bullets: [
              'Set your own threshold: every 5 visits, every 10, etc.',
              'Customers see their progress on the booking page',
              'Reward unlocks the moment it is earned, no manual tracking',
            ],
          },
          {
            icon:        Crown,
            title:       'Spend tiers',
            description: 'Promote regulars to Silver / Gold / VIP based on lifetime spend, with perks that scale.',
            bullets: [
              'Tier-only services or pricing',
              'Early access to new offerings',
              'VIPs auto-skip to the front of the waitlist',
            ],
          },
          {
            icon:        Sparkles,
            title:       'Referral program',
            description: 'Each customer gets a unique referral link. They get a credit when a friend books for the first time.',
            bullets: [
              'Trackable per-customer referral counts',
              'Auto-credits on first paid appointment',
              'Optional bonus when the referred customer rebooks',
            ],
          },
          {
            icon:        Gift,
            title:       'Birthday + anniversary gifts',
            description: 'Automatic special offers on a customer\'s birthday or one year after their first booking with you.',
            bullets: [
              'Auto-send a one-day promo code via email',
              'Configurable discount %, free add-on, or upgrade',
              'Skips customers who already have an open booking',
            ],
          },
        ]}
      />
    </div>
  )
}

function ReviewsPanel() {
  return (
    <div className="w-full p-3 sm:p-5 md:p-6">
      <ComingSoonPanel
        eyebrow="Coming Soon"
        title="Reviews"
        intro="Collect honest reviews from real customers, automatically, after every appointment. Show the best ones on your public site. Catch the unhappy ones before they hit Google."
        features={[
          {
            icon:        Star,
            tone:        'accent',
            title:       'Auto-request after every visit',
            description: 'A short, branded email goes out 24 hours after a completed appointment asking for a 1-5 star rating + a sentence.',
            bullets: [
              'Configurable delay (12 hours → 7 days)',
              'Skip customers who already left a review',
              'One-tap rating, no account needed',
            ],
          },
          {
            icon:        MessageSquare,
            title:       'Featured reviews on your site',
            description: 'Pick which reviews to feature in the Reviews block on your public booking page.',
            bullets: [
              'Auto-suggests 4 and 5-star reviews',
              'Hide a review at any time without deleting it',
              'Replaces the static placeholder reviews in Additionals',
            ],
          },
          {
            icon:        MailIcon,
            title:       'Smart routing',
            description: 'High ratings get gently asked to leave a Google review. Low ratings get routed to you privately first.',
            bullets: [
              'Catch service issues before they go public',
              'Direct link to your Google Business profile',
              'You decide which platforms to surface',
            ],
          },
          {
            icon:        Sparkles,
            title:       'Reply + thank',
            description: 'Reply to a review directly from BookReady, and the response is shown alongside the original.',
            bullets: [
              'Templated thank-yous for fast replies',
              'Mark a review as resolved internally',
              'Notification when a new review comes in',
            ],
          },
        ]}
      />
    </div>
  )
}
