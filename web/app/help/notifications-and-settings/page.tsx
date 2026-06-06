import type { Metadata } from 'next'
import HelpArticle from '@/components/help/HelpArticle'

export const metadata: Metadata = {
  title: 'Notifications & settings | BookReady Help',
  description: 'Email branding and templates, booking rules, preferences, and your account on BookReady.',
}

export default function Page() {
  return (
    <HelpArticle
      slug="notifications-and-settings"
      intro="Settings is where you fine-tune how BookReady behaves: the emails customers get, the rules bookings follow, and your own account."
    >
      <h2>Finding settings</h2>
      <p>
        Open <strong>Settings</strong> from the main menu. It&rsquo;s organized
        into tabs: Business, Preferences, Booking, Payments, Notifications,
        Account, and Danger Zone.
      </p>

      <h2>Email notifications</h2>
      <p>
        Under <strong>Notifications</strong>, you control the emails your customers
        receive: booking confirmations, cancellations, reschedules, and
        reminders. Two settings brand every one of them:
      </p>
      <ul>
        <li><strong>Sent-from name</strong>: who the email appears to come from (your business name).</li>
        <li><strong>Reply address</strong>: where customer replies land, so a &ldquo;quick question&rdquo; reaches you.</li>
      </ul>
      <p>
        You can also customize the subject line, intro, and sign-off of each
        template so the emails sound like your brand, not a robot.
      </p>

      <div className="help-note">
        <p><strong>Reminders cut no-shows</strong></p>
        <p>The automatic reminder email is one of the most valuable things BookReady does. Keep it on, and set the timing that fits your customers.</p>
      </div>

      <h2>Booking rules</h2>
      <p>
        The <strong>Booking</strong> tab holds the rules that shape how people book:
      </p>
      <ul>
        <li><strong>Auto-confirm</strong>: accept bookings instantly, or review each as a request.</li>
        <li><strong>Minimum notice</strong> and <strong>maximum days ahead</strong>: your booking window.</li>
        <li><strong>Time between start times</strong>: the spacing of appointment start times.</li>
        <li><strong>Cancellation</strong> and <strong>reschedule windows</strong>: what customers can change themselves (see <a href="/help/policies">Policies</a>).</li>
        <li><strong>Prevent duplicate bookings</strong>: stop one customer holding multiple slots.</li>
      </ul>

      <h2>Business &amp; preferences</h2>
      <p>
        <strong>Business</strong> holds your public details (name, contact info,
        location), the same info customers see on your page.{' '}
        <strong>Preferences</strong> covers smaller display choices like time
        format.
      </p>

      <h2>Your account</h2>
      <p>
        The <strong>Account</strong> tab is about you, the owner: your login
        email, your password, and signing out everywhere if you ever need to.
        Changing your password or email sends a security notice so you always know
        when your login changes.
      </p>

      <h2>Danger zone</h2>
      <p>
        The <strong>Danger Zone</strong> holds destructive actions like closing
        your account. They&rsquo;re tucked away on purpose, so you&rsquo;ll never hit
        them by accident.
      </p>
    </HelpArticle>
  )
}
