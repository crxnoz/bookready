import type { Metadata } from 'next'
import HelpArticle from '@/components/help/HelpArticle'

export const metadata: Metadata = {
  title: 'Bookings & calendar | BookReady Help',
  description: 'View appointments, confirm requests, add walk-ins, reschedule, and manage statuses on BookReady.',
}

export default function Page() {
  return (
    <HelpArticle
      slug="bookings-and-calendar"
      intro="The Bookings area is where your day actually happens: every appointment, request, and walk-in, with the controls to manage them."
    >
      <h2>Viewing your schedule</h2>
      <p>
        Open <strong>Bookings</strong> to see your calendar. Switch between
        <strong> day</strong>, <strong>week</strong>, and <strong>month</strong>{' '}
        views, and step forward or back with the arrows. Your dashboard also
        shows today and tomorrow at a glance, plus a tap-through week strip. Click
        any day to jump straight to it here.
      </p>

      <h2>Confirming requests</h2>
      <p>
        Depending on your settings, new bookings either confirm automatically or
        arrive as <strong>requests</strong> waiting for your approval. Pending
        requests show up at the top of Bookings and on your dashboard. Approve to
        lock them into your calendar, or decline to free the slot.
      </p>

      <div className="help-note">
        <p><strong>Auto-confirm or review?</strong></p>
        <p>Turn auto-confirm on for a frictionless customer experience, or off if you like to vet each booking. Find it in Settings → Booking. (See <a href="/help/notifications-and-settings">Notifications &amp; settings</a>.)</p>
      </div>

      <h2>Appointment statuses</h2>
      <ul>
        <li><strong>Pending</strong>: a request awaiting your confirmation.</li>
        <li><strong>Confirmed</strong>: locked in and on the calendar.</li>
        <li><strong>Completed</strong>: the appointment happened.</li>
        <li><strong>Cancelled</strong>: called off by you or the customer.</li>
        <li><strong>No-show</strong>: the customer didn&rsquo;t turn up. Marking this keeps your records (and no-show stats) honest.</li>
      </ul>

      <h2>Adding a booking yourself</h2>
      <p>
        Got a walk-in or a phone booking? Click <strong>New appointment</strong>,
        pick the service, choose a time, and enter the customer&rsquo;s details.
        It&rsquo;s the same calendar your online bookings flow into, so everything
        stays in one place.
      </p>

      <h2>Rescheduling &amp; cancelling</h2>
      <p>
        Open any appointment to change its time or cancel it. Customers can also
        reschedule or cancel their own bookings using the secure link in their
        confirmation email, within the windows you set in your policies, so
        nobody cancels an hour before. (See <a href="/help/policies">Policies</a>.)
      </p>

      <h2>Reminders</h2>
      <p>
        BookReady automatically emails customers a reminder before their
        appointment, which cuts no-shows without any effort from you. You control
        the wording and timing in your notification settings.
      </p>
    </HelpArticle>
  )
}
