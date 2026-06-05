/**
 * #131 — Help Center navigation registry.
 *
 * Single source of truth for the /help sidebar TOC AND the /help index
 * card grid. Add an article here + create web/app/help/<slug>/page.tsx
 * and it appears in both places automatically.
 *
 * Order defines display order. Keep slugs URL-clean (lowercase, dashes).
 */

import {
  Rocket, Globe, Scissors, Clock, Calendar, Users,
  CreditCard, ShieldCheck, Bell, Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface HelpArticleMeta {
  slug:  string
  title: string
  blurb: string
  icon:  LucideIcon
}

export const HELP_ARTICLES: HelpArticleMeta[] = [
  {
    slug:  'getting-started',
    title: 'Getting started',
    blurb: 'Your first 10 minutes — the setup wizard, your dashboard, and going live.',
    icon:  Rocket,
  },
  {
    slug:  'your-website',
    title: 'Your website',
    blurb: 'Edit your booking page: header, content, gallery, footer, and live preview.',
    icon:  Globe,
  },
  {
    slug:  'services-and-pricing',
    title: 'Services & pricing',
    blurb: 'Add services, categories, add-ons, durations, deposits, and buffers.',
    icon:  Scissors,
  },
  {
    slug:  'hours-and-availability',
    title: 'Hours & availability',
    blurb: 'Set your open hours, blocked dates, booking window, and slot intervals.',
    icon:  Clock,
  },
  {
    slug:  'bookings-and-calendar',
    title: 'Bookings & calendar',
    blurb: 'View appointments, confirm requests, add walk-ins, and manage statuses.',
    icon:  Calendar,
  },
  {
    slug:  'customers',
    title: 'Customers',
    blurb: 'Your client list, visit history, VIP flags, notes, and tags.',
    icon:  Users,
  },
  {
    slug:  'payments',
    title: 'Payments & Stripe',
    blurb: 'Connect Stripe, take deposits, see payouts, and issue refunds.',
    icon:  CreditCard,
  },
  {
    slug:  'policies',
    title: 'Policies',
    blurb: 'Cancellation, no-show, late, and deposit policies — and how clients see them.',
    icon:  ShieldCheck,
  },
  {
    slug:  'notifications-and-settings',
    title: 'Notifications & settings',
    blurb: 'Email branding, templates, booking rules, and your account.',
    icon:  Bell,
  },
  {
    slug:  'your-plan-and-billing',
    title: 'Your plan & billing',
    blurb: 'Your free trial, plans, changing or cancelling, and the billing portal.',
    icon:  Wallet,
  },
]

export function helpArticleBySlug(slug: string): HelpArticleMeta | undefined {
  return HELP_ARTICLES.find(a => a.slug === slug)
}
