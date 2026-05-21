'use client'

import Link from 'next/link'
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Globe,
  Plus,
  ChevronRight,
} from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DATES = [18, 19, 20, 21, 22, 23, 24]

const APPOINTMENTS = [
  { client: 'Maya Rivera', service: 'Signature Cut', time: 'Today · 2:30 PM', duration: '45 min · $65', status: 'confirmed' },
  { client: 'Alina Cruz', service: 'Gel Manicure', time: 'Tomorrow · 11:00 AM', duration: '60 min · $65', status: 'pending' },
  { client: 'Jordan Lee', service: 'Beard Trim', time: 'Friday · 4:15 PM', duration: '30 min · $30', status: 'confirmed' },
]

export default function BookingsPage() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Topbar */}
      <div className="flex items-center justify-between gap-4 border-b border-[rgba(18,18,18,0.10)] bg-white px-5 md:px-6 py-3.5 flex-shrink-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">
          Bookings / Overview
        </p>
        <div className="flex items-center gap-2 border border-[rgba(18,18,18,0.10)] px-2.5 py-1.5 text-[11px] font-medium text-near-black bg-white">
          <span className="w-1.5 h-1.5 rounded-full bg-near-black" />
          Lush Studio
        </div>
      </div>

      <div className="flex-1 p-5 md:p-6 md:overflow-y-auto space-y-6">

        {/* Page head */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1">
              Appointment management
            </p>
            <h1 className="text-2xl font-bold text-near-black tracking-tight">Bookings</h1>
            <p className="text-sm text-muted-text mt-1">
              Manage appointments, availability, and the client booking experience.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              disabled
              className="flex items-center gap-2 border border-[rgba(18,18,18,0.12)] bg-white px-3 py-2 text-xs font-semibold text-near-black opacity-50 cursor-not-allowed"
            >
              <Globe size={13} /> View Booking Site
            </button>
            <button
              disabled
              className="flex items-center gap-2 bg-near-black text-white px-3 py-2 text-xs font-bold tracking-[0.08em] uppercase opacity-50 cursor-not-allowed"
            >
              <Plus size={13} /> Create Appointment
            </button>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 border border-[rgba(18,18,18,0.10)] divide-y md:divide-y-0 md:divide-x divide-[rgba(18,18,18,0.10)]">
          {[
            { label: "Today's Appointments", value: '0', note: 'No bookings today' },
            { label: 'This Week', value: '4', note: '2 pending confirmation' },
            { label: 'Booking Rate', value: '68%', note: 'Visitors who started booking' },
            { label: 'Revenue', value: '$420', note: 'Estimated from booked services' },
          ].map(s => (
            <div key={s.label} className="bg-white p-4">
              <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text mb-2">{s.label}</p>
              <p className="text-3xl font-bold text-near-black tracking-tight mb-1">{s.value}</p>
              <p className="text-xs text-muted-text">{s.note}</p>
            </div>
          ))}
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

          {/* Left column */}
          <div className="space-y-5">

            {/* Upcoming appointments */}
            <div className="bg-white border border-[rgba(18,18,18,0.10)]">
              <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[rgba(18,18,18,0.08)]">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text mb-0.5">Schedule</p>
                  <h2 className="text-base font-bold text-near-black tracking-tight">Upcoming Appointments</h2>
                </div>
                <div className="flex gap-2">
                  <button className="border border-[rgba(18,18,18,0.12)] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-near-black hover:bg-cream transition-colors">All</button>
                  <button className="border border-[rgba(18,18,18,0.12)] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-muted-text hover:bg-cream transition-colors">Pending</button>
                </div>
              </div>
              {APPOINTMENTS.map((a, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_auto_auto] gap-3 items-center px-5 py-4 border-b border-[rgba(18,18,18,0.06)] last:border-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-near-black">{a.client}</p>
                    <p className="text-xs text-muted-text">{a.service}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-near-black">{a.time}</p>
                    <p className="text-xs text-muted-text">{a.duration}</p>
                  </div>
                  <span
                    className={`text-[9px] font-bold tracking-[0.06em] uppercase border px-2 py-0.5 self-start ${
                      a.status === 'confirmed'
                        ? 'bg-white border-[rgba(18,18,18,0.12)] text-near-black'
                        : 'bg-blush border-transparent text-near-black'
                    }`}
                  >
                    {a.status}
                  </span>
                  <div className="flex gap-1.5">
                    {['View', 'Reschedule', 'Cancel'].map(action => (
                      <button
                        key={action}
                        disabled
                        className="border border-[rgba(18,18,18,0.10)] px-2 py-1 text-[10px] font-medium text-near-black opacity-50 cursor-not-allowed"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Mini calendar */}
            <div className="bg-white border border-[rgba(18,18,18,0.10)]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(18,18,18,0.08)]">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text mb-0.5">Week of Nov 18</p>
                  <h2 className="text-base font-bold text-near-black tracking-tight">Calendar</h2>
                </div>
                <div className="flex gap-2">
                  <button className="border border-[rgba(18,18,18,0.12)] px-2.5 py-1.5 text-[10px] font-semibold text-near-black hover:bg-cream transition-colors">Today</button>
                  <button className="border border-[rgba(18,18,18,0.12)] px-2.5 py-1.5 text-[10px] font-semibold text-muted-text hover:bg-cream transition-colors">Week</button>
                </div>
              </div>
              <div className="grid grid-cols-7 divide-x divide-[rgba(18,18,18,0.06)]">
                {DAYS.map((day, i) => (
                  <div
                    key={day}
                    className={`p-3 min-h-[90px] ${i === 1 ? 'bg-lavender' : 'bg-white'}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-0.5 mb-2">
                      <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-muted-text">{day}</span>
                      <span className="text-[11px] font-bold text-near-black">{DATES[i]}</span>
                    </div>
                    <div className="space-y-1">
                      {i === 1 && (
                        <div className="bg-blush px-1.5 py-0.5 text-[9px] font-medium text-near-black">2:30p Cut</div>
                      )}
                      {i === 2 && (
                        <div className="border border-[rgba(18,18,18,0.12)] px-1.5 py-0.5 text-[9px] font-medium text-near-black">11a Mani</div>
                      )}
                      {i === 4 && (
                        <div className="bg-blush px-1.5 py-0.5 text-[9px] font-medium text-near-black">4:15p Beard</div>
                      )}
                      {i === 5 && (
                        <div className="border border-[rgba(18,18,18,0.12)] px-1.5 py-0.5 text-[9px] font-medium text-near-black">10a Color</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Availability + Booking Rules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 border border-[rgba(18,18,18,0.10)] divide-y sm:divide-y-0 sm:divide-x divide-[rgba(18,18,18,0.10)]">
              <div className="bg-white p-5">
                <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text mb-1.5">Availability</p>
                <h3 className="text-sm font-bold text-near-black tracking-tight mb-3">When clients can book</h3>
                <ul className="space-y-1.5 mb-4">
                  {[
                    { label: 'Booking status', value: 'Open', badge: 'lavender' as const },
                    { label: 'Hours setup', value: 'Needs review', badge: 'blush' as const },
                    { label: 'Next slot', value: 'Tomorrow · 10:30 AM' },
                  ].map(r => (
                    <li key={r.label} className="flex items-center justify-between border border-[rgba(18,18,18,0.08)] px-3 py-2 text-xs">
                      <span className="text-muted-text">{r.label}</span>
                      {r.badge ? (
                        <span className={`text-[9px] font-bold tracking-[0.06em] uppercase border px-1.5 py-0.5 ${r.badge === 'lavender' ? 'bg-lavender border-transparent' : 'bg-blush border-transparent'} text-near-black`}>
                          {r.value}
                        </span>
                      ) : (
                        <span className="font-semibold text-near-black">{r.value}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <Link href="/editor/hours" className="block bg-near-black text-white text-[10px] font-bold tracking-[0.12em] uppercase text-center py-2.5 hover:bg-[#2a2a2a] transition-colors">
                  Edit Availability
                </Link>
              </div>
              <div className="bg-white p-5">
                <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text mb-1.5">Booking Rules</p>
                <h3 className="text-sm font-bold text-near-black tracking-tight mb-3">How bookings behave</h3>
                <ul className="space-y-1.5 mb-4">
                  {[
                    { label: 'Booking window', value: '30 days ahead' },
                    { label: 'Minimum notice', value: '12 hours' },
                    { label: 'Buffer time', value: '10 minutes' },
                    { label: 'Auto-confirm', value: 'Off' },
                    { label: 'Deposits', value: 'Coming soon', muted: true },
                  ].map(r => (
                    <li key={r.label} className="flex items-center justify-between border border-[rgba(18,18,18,0.08)] px-3 py-2 text-xs">
                      <span className="text-muted-text">{r.label}</span>
                      <span className={`font-semibold ${r.muted ? 'text-muted-text' : 'text-near-black'}`}>{r.value}</span>
                    </li>
                  ))}
                </ul>
                <button disabled className="w-full bg-near-black text-white text-[10px] font-bold tracking-[0.12em] uppercase py-2.5 opacity-50 cursor-not-allowed">
                  Edit Rules
                </button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Booking site status */}
            <div className="bg-white border border-[rgba(18,18,18,0.10)] p-5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text">Booking Site</p>
                <span className="text-[9px] font-bold tracking-[0.06em] uppercase bg-lavender border-transparent border px-1.5 py-0.5 text-near-black">Live</span>
              </div>
              <h3 className="text-sm font-bold text-near-black tracking-tight mb-3">Status</h3>
              <ul className="space-y-1.5 mb-4">
                <li className="flex items-center justify-between border border-[rgba(18,18,18,0.08)] px-3 py-2 text-xs">
                  <span className="text-muted-text">Booking enabled</span>
                  <span className="font-semibold text-near-black">Yes</span>
                </li>
                <li className="flex items-center justify-between border border-[rgba(18,18,18,0.08)] px-3 py-2 text-xs">
                  <span className="text-muted-text">Public URL</span>
                  <span className="font-semibold text-near-black text-[10px]">lushstudio.bkrdy.me</span>
                </li>
              </ul>
              <a
                href="#"
                target="_blank"
                className="flex items-center gap-2 bg-near-black text-white text-[10px] font-bold tracking-[0.12em] uppercase py-2.5 px-4 hover:bg-[#2a2a2a] transition-colors justify-center"
              >
                <Globe size={11} /> View Site
              </a>
            </div>

            {/* Quick actions */}
            <div className="bg-white border border-[rgba(18,18,18,0.10)] p-5">
              <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text mb-1.5">Quick Actions</p>
              <h3 className="text-sm font-bold text-near-black tracking-tight mb-3">Get things done</h3>
              <ul className="space-y-1">
                {[
                  { label: 'Edit Services', href: '/editor/services' },
                  { label: 'Set Hours', href: '/editor/hours' },
                  { label: 'Update Policies', href: '/editor/policies' },
                ].map(ql => (
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
            </div>

            {/* Booking setup checklist */}
            <div className="bg-white border border-[rgba(18,18,18,0.10)] p-5">
              <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text mb-1.5">Booking Setup</p>
              <h3 className="text-sm font-bold text-near-black tracking-tight mb-3">Checklist</h3>
              <ul className="space-y-1.5">
                {[
                  { label: 'Services added', done: true },
                  { label: 'Business hours', done: false },
                  { label: 'Policies', done: false },
                  { label: 'Booking form', soon: true },
                  { label: 'Payments / deposits', soon: true },
                ].map(item => (
                  <li key={item.label} className="flex items-center justify-between border border-[rgba(18,18,18,0.08)] px-3 py-2 text-xs">
                    <span className="font-medium text-near-black">{item.label}</span>
                    {item.soon ? (
                      <span className="text-[9px] font-bold tracking-[0.06em] uppercase bg-lavender border-transparent border px-1.5 py-0.5 text-near-black">Soon</span>
                    ) : item.done ? (
                      <CheckCircle size={13} className="text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle size={13} className="text-[rgba(18,18,18,0.3)] flex-shrink-0" />
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Coming soon reminder */}
            <div className="bg-white border border-[rgba(18,18,18,0.10)] p-5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text">Client Reminder</p>
                <span className="text-[9px] font-bold tracking-[0.06em] uppercase bg-lavender border-transparent border px-1.5 py-0.5 text-near-black">Coming soon</span>
              </div>
              <div className="bg-blush px-4 py-3 text-xs text-near-black mt-3">
                &ldquo;Your appointment with Lush Studio is tomorrow at 10:30 AM.&rdquo;
              </div>
              <button
                disabled
                className="mt-3 w-full bg-near-black text-white text-[10px] font-bold tracking-[0.12em] uppercase py-2.5 opacity-50 cursor-not-allowed"
              >
                Configure Reminders
              </button>
            </div>
          </div>
        </div>

        {/* Coming soon notice */}
        <div className="border-l-4 border-near-black bg-white px-5 py-4">
          <p className="text-xs font-bold text-near-black mb-1">Booking engine coming soon</p>
          <p className="text-xs text-muted-text">Real appointment booking, confirmation emails, and client management will be available in an upcoming release. Set up your hours and policies now to be ready.</p>
        </div>

      </div>
    </div>
  )
}
