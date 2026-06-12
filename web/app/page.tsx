import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarCheck,
  CreditCard,
  Globe,
  MailCheck,
  Sparkles,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'BookReady — Booking websites for beauty pros',
  description:
    'BookReady is a booking website and appointment manager for salons, barbers, spas, nail techs, and solo beauty pros. Take deposits with Stripe, send reminders automatically, run everything from one editor.',
}

const FEATURES = [
  {
    icon: Globe,
    title: 'Your own booking site',
    body: 'A public, mobile-first site at yourname.bkrdy.me. Show your services, staff, hours, gallery, and policies. Edit anything in seconds — no developer required.',
  },
  {
    icon: CreditCard,
    title: 'Take deposits with Stripe',
    body: 'Connect your Stripe account in a couple of clicks. Charge a flat deposit, a percentage, or the full amount up front. Payouts go from Stripe directly to your bank — we never touch the money.',
  },
  {
    icon: MailCheck,
    title: 'Reminders that go out on time',
    body: 'Confirmations the moment a booking is made. Reminder emails a day before the appointment. Cancel and reschedule links your clients can use without calling you.',
  },
  {
    icon: CalendarCheck,
    title: 'One editor for everything',
    body: 'Manage your calendar, customers, services, hours, payments, and site content from a single dashboard. Designed for one person running a busy chair.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream text-near-black flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  )
}

/* ── Header ─────────────────────────────────────────────────────────── */

function SiteHeader() {
  return (
    <header className="border-b border-[rgba(18,18,18,0.10)] bg-cream/95 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-[1140px] mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 bg-near-black flex items-center justify-center flex-shrink-0">
            <img src="/logo.svg" alt="" className="w-4 h-4 invert" />
          </div>
          <span className="text-sm font-bold tracking-tight group-hover:opacity-75 transition-opacity">
            BookReady
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="text-xs sm:text-[13px] font-medium text-muted-text hover:text-near-black transition-colors px-3 py-2"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="text-[11px] sm:text-xs font-bold tracking-[0.14em] uppercase bg-near-black text-white px-4 sm:px-5 py-2.5 hover:bg-[#2a2a2a] transition-colors"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  )
}

/* ── Hero ───────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="border-b border-[rgba(18,18,18,0.10)]">
      <div className="max-w-[1140px] mx-auto px-6 sm:px-8 py-20 sm:py-28">
        <div className="max-w-[760px]">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Booking sites for beauty pros
          </p>
          <h1 className="text-[40px] sm:text-[56px] lg:text-[68px] font-bold tracking-tight leading-[1.02] mb-6">
            Build a booking site clients actually want to use.
          </h1>
          <p className="text-base sm:text-lg text-muted-text leading-relaxed mb-10 max-w-[640px]">
            BookReady gives salons, barbers, spas, nail techs, and solo beauty pros a
            booking website, deposit collection, automatic reminders, and a calendar
            that just works. Designed to look like your studio, not a software product.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase px-7 py-4 hover:bg-[#2a2a2a] transition-colors"
            >
              Start your site
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border border-[rgba(18,18,18,0.20)] bg-white text-[11px] font-bold tracking-[0.18em] uppercase text-near-black px-7 py-4 hover:border-near-black transition-colors"
            >
              Log in
            </Link>
          </div>
          <p className="text-xs text-muted-text mt-6">
            No long-term contracts. Cancel anytime from settings.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ── Features ───────────────────────────────────────────────────────── */

function Features() {
  return (
    <section className="border-b border-[rgba(18,18,18,0.10)] bg-white">
      <div className="max-w-[1140px] mx-auto px-6 sm:px-8 py-20 sm:py-24">
        <div className="max-w-[640px] mb-14">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-3">
            What you get
          </p>
          <h2 className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.1]">
            Everything you need to take bookings online. Nothing you don&rsquo;t.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[rgba(18,18,18,0.10)] border border-[rgba(18,18,18,0.10)]">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-white p-8 sm:p-10">
              <Icon className="w-5 h-5 mb-5" strokeWidth={1.5} />
              <h3 className="text-lg font-bold tracking-tight mb-2.5">{title}</h3>
              <p className="text-sm text-muted-text leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── How it works ───────────────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Create your account',
      body: 'Sign up in under a minute. Pick a business name — that becomes your booking URL.',
    },
    {
      n: '02',
      title: 'Add your services & hours',
      body: 'Tell BookReady what you offer, how long it takes, what it costs, and when you work. Upload a few photos.',
    },
    {
      n: '03',
      title: 'Share your link',
      body: 'Drop your bkrdy.me link in your Instagram bio, on your business card, or wherever clients find you. Bookings start showing up.',
    },
  ]
  return (
    <section className="border-b border-[rgba(18,18,18,0.10)]">
      <div className="max-w-[1140px] mx-auto px-6 sm:px-8 py-20 sm:py-24">
        <div className="max-w-[640px] mb-14">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-3">
            How it works
          </p>
          <h2 className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.1]">
            From signed-up to taking bookings in an afternoon.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          {steps.map(({ n, title, body }) => (
            <div key={n}>
              <p className="text-[11px] font-bold tracking-[0.18em] text-near-black mb-4">{n}</p>
              <h3 className="text-lg font-bold tracking-tight mb-2.5">{title}</h3>
              <p className="text-sm text-muted-text leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Closing CTA ────────────────────────────────────────────────────── */

function ClosingCTA() {
  return (
    <section className="bg-lavender border-b border-[rgba(18,18,18,0.10)]">
      <div className="max-w-[1140px] mx-auto px-6 sm:px-8 py-20 sm:py-24 text-center">
        <h2 className="text-[28px] sm:text-[40px] font-bold tracking-tight leading-[1.05] mb-5 max-w-[640px] mx-auto">
          Ready to stop trading DMs for appointments?
        </h2>
        <p className="text-sm sm:text-base text-near-black/70 mb-9 max-w-[520px] mx-auto leading-relaxed">
          Set up your booking site, plug in Stripe, and let clients book themselves.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2 bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase px-8 py-4 hover:bg-[#2a2a2a] transition-colors"
        >
          Start your site
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  )
}

/* ── Footer ─────────────────────────────────────────────────────────── */

function SiteFooter() {
  return (
    <footer className="bg-cream">
      <div className="max-w-[1140px] mx-auto px-6 sm:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-text">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 bg-near-black flex items-center justify-center flex-shrink-0">
            <img src="/logo.svg" alt="" className="w-3 h-3 invert" />
          </div>
          <span>&copy; {new Date().getFullYear()} BookReady. Operated by DaysGraphic LLC.</span>
        </div>
        <div className="flex flex-wrap gap-5">
          <Link href="/privacy" className="hover:text-near-black transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-near-black transition-colors">Terms of Service</Link>
          <Link href="/refund" className="hover:text-near-black transition-colors">Refunds</Link>
          <Link href="/billing-terms" className="hover:text-near-black transition-colors">Billing</Link>
          <Link href="/login" className="hover:text-near-black transition-colors">Log in</Link>
          <Link href="/register" className="hover:text-near-black transition-colors">Sign up</Link>
          <a href="mailto:hello@mybookready.com" className="hover:text-near-black transition-colors">
            hello@mybookready.com
          </a>
        </div>
      </div>
    </footer>
  )
}
