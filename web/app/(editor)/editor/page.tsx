'use client'

import Link from 'next/link'
import {
  Globe,
  Scissors,
  Clock,
  FileText,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Topbar */}
      <div className="flex items-center justify-between gap-4 border-b border-[rgba(18,18,18,0.10)] bg-white px-5 md:px-6 py-3.5 flex-shrink-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">
          Dashboard / Overview
        </p>
        <div className="flex items-center gap-2 border border-[rgba(18,18,18,0.10)] px-2.5 py-1.5 text-[11px] font-medium text-near-black bg-white">
          <span className="w-1.5 h-1.5 rounded-full bg-near-black" />
          Lush Studio
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 p-5 md:p-6 md:overflow-y-auto space-y-6">

        {/* Page head */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1">Welcome back</p>
            <h1 className="text-2xl font-bold text-near-black tracking-tight">Dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/editor/website?tab=business"
              className="flex items-center gap-2 border border-[rgba(18,18,18,0.12)] bg-white px-3 py-2 text-xs font-semibold text-near-black hover:bg-cream transition-colors"
            >
              <Globe size={13} /> Edit Website
            </Link>
            <Link
              href="/editor/bookings"
              className="flex items-center gap-2 bg-near-black text-white px-3 py-2 text-xs font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors"
            >
              <Calendar size={13} /> Bookings
            </Link>
          </div>
        </div>

        {/* Stat cards — 3 across on desktop, 1 on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-[rgba(18,18,18,0.10)] divide-y sm:divide-y-0 sm:divide-x divide-[rgba(18,18,18,0.10)]">
          <StatCard
            label="Site Status"
            title="Live"
            badge={{ label: 'Active', style: 'lavender' }}
            rows={[
              { label: 'Template', value: 'The Fade Room' },
              { label: 'Subscription', value: 'Active' },
            ]}
            action={{ label: 'Edit Website', href: '/editor/website?tab=business' }}
          />
          <div className="bg-white p-5">
            <p className={eyebrow}>Setup Checklist</p>
            <h3 className="text-base font-bold text-near-black tracking-tight mt-1.5 mb-3">Finish your launch</h3>
            <ul className="space-y-2">
              {[
                { label: 'Business profile', done: true },
                { label: 'Services added', done: true },
                { label: 'Hours', done: false },
                { label: 'Policies', done: false },
                { label: 'Booking setup', soon: true },
              ].map(item => (
                <li key={item.label} className="flex items-center justify-between border border-[rgba(18,18,18,0.08)] px-3 py-2 text-xs">
                  <span className="font-medium text-near-black">{item.label}</span>
                  {item.soon ? (
                    <span className="text-[9px] font-bold tracking-[0.06em] uppercase bg-lavender px-1.5 py-0.5">Coming soon</span>
                  ) : item.done ? (
                    <CheckCircle size={13} className="text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle size={13} className="text-[rgba(18,18,18,0.35)] flex-shrink-0" />
                  )}
                </li>
              ))}
            </ul>
            <Link href="/editor/hours" className="mt-3 block bg-near-black text-white text-[10px] font-bold tracking-[0.12em] uppercase text-center py-2.5 hover:bg-[#2a2a2a] transition-colors">
              Continue Setup
            </Link>
          </div>
          <StatCard
            label="Quick Actions"
            title="Jump in"
            quickLinks={[
              { label: 'Edit Business Info', href: '/editor/website?tab=business' },
              { label: 'Add Service', href: '/editor/services' },
              { label: 'Set Hours', href: '/editor/hours' },
              { label: 'Add Policies', href: '/editor/website?tab=content' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-[rgba(18,18,18,0.10)] divide-y sm:divide-y-0 sm:divide-x divide-[rgba(18,18,18,0.10)]">
          <div className="bg-white p-5 sm:col-span-2 lg:col-span-2">
            <p className={eyebrow}>Booking Overview</p>
            <h3 className="text-base font-bold text-near-black tracking-tight mt-1.5 mb-2">No appointments yet</h3>
            <p className="text-xs text-muted-text mb-4">Booking tools are coming soon. Set up your hours and policies in the meantime.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/editor/bookings" className="flex items-center gap-2 border border-[rgba(18,18,18,0.12)] bg-white px-3 py-2 text-xs font-semibold text-near-black hover:bg-cream transition-colors">
                <Calendar size={12} /> View Bookings
              </Link>
              <Link href="/editor/hours" className="flex items-center gap-2 bg-near-black text-white px-3 py-2 text-xs font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors">
                Set Up Availability
              </Link>
            </div>
          </div>
          <StatCard
            label="Payments / Plan"
            title="Monthly · Active"
            rows={[
              { label: 'Next billing', value: 'Dec 12, 2026' },
              { label: 'Card', value: '•••• 4242' },
            ]}
            action={{ label: 'Manage Plan', href: '#' }}
          />
        </div>

        {/* Website hub */}
        <div>
          <h2 className="text-lg font-bold text-near-black tracking-tight mb-1">Website</h2>
          <p className="text-xs text-muted-text mb-3">Sections clients see on your booking site.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 border border-[rgba(18,18,18,0.10)] divide-x divide-[rgba(18,18,18,0.10)]">
            {[
              { label: 'Business Info', icon: Globe, status: 'Complete', href: '/editor/website?tab=business' },
              { label: 'Services', icon: Scissors, status: '4 active', href: '/editor/services' },
              { label: 'Hours', icon: Clock, status: 'Needs setup', href: '/editor/hours', warn: true },
              { label: 'Policies', icon: FileText, status: 'Needs setup', href: '/editor/website?tab=content', warn: true },
            ].map(({ label, icon: Icon, status, href, warn }) => (
              <div key={label} className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className="text-muted-text flex-shrink-0" />
                  <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">{label}</p>
                </div>
                <p className={`text-sm font-semibold mb-3 ${warn ? 'text-[rgba(18,18,18,0.4)]' : 'text-near-black'}`}>
                  {status}
                </p>
                <Link
                  href={href}
                  className="flex items-center gap-1 text-[10px] font-bold tracking-[0.10em] uppercase text-near-black hover:opacity-70 transition-opacity"
                >
                  Edit <ChevronRight size={10} />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-5">
          <p className={eyebrow}>Recent Activity</p>
          <h3 className="text-base font-bold text-near-black tracking-tight mt-1.5 mb-3">Latest changes</h3>
          <ul className="space-y-2">
            {[
              { label: 'Site created', time: '3d ago' },
              { label: 'Checkout completed', time: '3d ago' },
              { label: 'Business profile updated', time: '2d ago' },
              { label: 'Service added', time: '1d ago' },
            ].map(item => (
              <li key={item.label} className="flex items-center justify-between border border-[rgba(18,18,18,0.08)] px-3 py-2 text-xs">
                <span className="font-medium text-near-black">{item.label}</span>
                <span className="text-muted-text">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}

// ── Shared atoms ──────────────────────────────────────────

const eyebrow = 'text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text'

interface BadgeProps { label: string; style: 'lavender' | 'blush' | 'dark' }

function Badge({ label, style }: BadgeProps) {
  const cls = {
    lavender: 'bg-lavender text-near-black border-transparent',
    blush: 'bg-blush text-near-black border-transparent',
    dark: 'bg-near-black text-white border-near-black',
  }[style]
  return (
    <span className={`text-[9px] font-bold tracking-[0.06em] uppercase border px-1.5 py-0.5 ${cls}`}>
      {label}
    </span>
  )
}

interface StatCardProps {
  label: string
  title: string
  badge?: BadgeProps
  rows?: { label: string; value: string }[]
  action?: { label: string; href: string }
  quickLinks?: { label: string; href: string }[]
}

function StatCard({ label, title, badge, rows, action, quickLinks }: StatCardProps) {
  return (
    <div className="bg-white p-5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className={eyebrow}>{label}</p>
        {badge && <Badge {...badge} />}
      </div>
      <h3 className="text-base font-bold text-near-black tracking-tight mb-3">{title}</h3>
      {rows && (
        <ul className="space-y-1.5 mb-4">
          {rows.map(r => (
            <li key={r.label} className="flex items-center justify-between border border-[rgba(18,18,18,0.08)] px-3 py-2 text-xs">
              <span className="text-muted-text">{r.label}</span>
              <span className="font-semibold text-near-black">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
      {quickLinks && (
        <ul className="space-y-1.5 mb-4">
          {quickLinks.map(ql => (
            <li key={ql.label}>
              <Link
                href={ql.href}
                className="flex items-center justify-between border border-[rgba(18,18,18,0.08)] px-3 py-2 text-xs font-medium text-near-black hover:bg-cream transition-colors"
              >
                {ql.label} <ChevronRight size={11} className="text-muted-text" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {action && (
        <Link
          href={action.href}
          className="flex items-center gap-1.5 bg-near-black text-white text-[10px] font-bold tracking-[0.12em] uppercase text-center py-2.5 px-4 hover:bg-[#2a2a2a] transition-colors justify-center"
        >
          {action.label} <ExternalLink size={10} />
        </Link>
      )}
    </div>
  )
}
