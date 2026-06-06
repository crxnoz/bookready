import type { Metadata } from 'next'
import HelpArticle from '@/components/help/HelpArticle'

export const metadata: Metadata = {
  title: 'Hours & availability | BookReady Help',
  description: 'Set your open hours, blocked dates, booking window, time between start times, and staff schedules on BookReady.',
}

export default function Page() {
  return (
    <HelpArticle
      slug="hours-and-availability"
      intro="Your availability is the rulebook your calendar follows. Get it right once and customers can only ever book times that actually work for you."
    >
      <h2>Business hours</h2>
      <p>
        Under <strong>Availability</strong>, set the days and times you&rsquo;re
        open. Customers can only book inside these windows. Toggle a day off
        entirely (Sundays, say) and it disappears from the booking calendar.
      </p>

      <h2>Blocked dates</h2>
      <p>
        Going on vacation, or closing for a holiday? Add a <strong>blocked
        date</strong> (or range) and that day stops accepting bookings,
        without changing your normal weekly hours. Your regular schedule
        returns automatically afterward.
      </p>

      <h2>Booking window</h2>
      <p>Two settings control how far ahead and how last-minute customers can book:</p>
      <ul>
        <li><strong>Minimum notice</strong>: how soon before an appointment someone can still book it. Set this so nobody grabs a slot two minutes from now.</li>
        <li><strong>Maximum days ahead</strong>: how far into the future the calendar opens. Keeps people from booking a year out.</li>
      </ul>

      <h2>Time between start times</h2>
      <p>
        The <strong>time between appointment start times</strong> decides the start
        times customers see: every 15, 30, or 60 minutes. A 30-minute setting on a
        90-minute service means start times like 9:00, 9:30, 10:00. Smaller settings
        offer more choices; larger ones keep your day tidier.
      </p>

      <div className="help-note">
        <p><strong>Gaps live with your services</strong></p>
        <p>Need cleanup or travel time between appointments? Add a gap on the service itself (see <a href="/help/services-and-pricing">Services &amp; pricing</a>), not here.</p>
      </div>

      <h2>Staff schedules</h2>
      <p>
        If you have a team, each staff member can have their own hours and blocked
        dates. A customer booking a service only sees times when a qualified team
        member is actually free. Set these on each person&rsquo;s profile under{' '}
        <strong>Staff</strong>.
      </p>

      <h2>How it all comes together</h2>
      <p>
        When a customer picks a service, BookReady checks everything at once: your
        hours, blocked dates, the booking window, existing appointments, gaps
        between appointments, and staff availability. It shows only the times that
        truly work. You never have to worry about a double-booking slipping through.
      </p>
    </HelpArticle>
  )
}
