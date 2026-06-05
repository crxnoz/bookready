import type { Metadata } from 'next'
import HelpArticle from '@/components/help/HelpArticle'

export const metadata: Metadata = {
  title: 'Hours & availability — BookReady Help',
  description: 'Set your open hours, blocked dates, booking window, slot intervals, and staff schedules on BookReady.',
}

export default function Page() {
  return (
    <HelpArticle
      slug="hours-and-availability"
      intro="Your availability is the rulebook your calendar follows. Get it right once and clients can only ever book times that actually work for you."
    >
      <h2>Business hours</h2>
      <p>
        Under <strong>Availability</strong>, set the days and times you&rsquo;re
        open. Clients can only book inside these windows. Toggle a day off
        entirely (Sundays, say) and it disappears from the booking calendar.
      </p>

      <h2>Blocked dates</h2>
      <p>
        Going on vacation, or closing for a holiday? Add a <strong>blocked
        date</strong> (or range) and that day stops accepting bookings —
        without changing your normal weekly hours. Your regular schedule
        returns automatically afterward.
      </p>

      <h2>Booking window</h2>
      <p>Two settings control how far ahead and how last-minute clients can book:</p>
      <ul>
        <li><strong>Minimum notice</strong> — how soon before an appointment someone can still book it. Set this so nobody grabs a slot two minutes from now.</li>
        <li><strong>Maximum days ahead</strong> — how far into the future the calendar opens. Keeps people from booking a year out.</li>
      </ul>

      <h2>Slot intervals</h2>
      <p>
        The <strong>slot interval</strong> decides the start times clients see —
        every 15, 30, or 60 minutes. A 30-minute interval on a 90-minute service
        means start times like 9:00, 9:30, 10:00. Smaller intervals offer more
        choices; larger ones keep your day tidier.
      </p>

      <div className="help-note">
        <p><strong>Buffers live with your services</strong></p>
        <p>Need cleanup or travel time between appointments? Add a buffer on the service itself (see <a href="/help/services-and-pricing">Services &amp; pricing</a>), not here.</p>
      </div>

      <h2>Staff schedules</h2>
      <p>
        If you have a team, each staff member can have their own hours and blocked
        dates. A client booking a service only sees times when a qualified team
        member is actually free. Set these on each person&rsquo;s profile under{' '}
        <strong>Staff</strong>.
      </p>

      <h2>How it all comes together</h2>
      <p>
        When a client picks a service, BookReady checks everything at once — your
        hours, blocked dates, the booking window, existing appointments, buffers,
        and staff availability — and shows only the times that truly work. You
        never have to worry about a double-booking slipping through.
      </p>
    </HelpArticle>
  )
}
