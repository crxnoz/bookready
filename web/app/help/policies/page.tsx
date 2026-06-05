import type { Metadata } from 'next'
import HelpArticle from '@/components/help/HelpArticle'

export const metadata: Metadata = {
  title: 'Policies — BookReady Help',
  description: 'Set cancellation, no-show, late, and deposit policies on BookReady, and control how clients reschedule or cancel.',
}

export default function Page() {
  return (
    <HelpArticle
      slug="policies"
      intro="Clear policies protect your time without making you the bad guy. BookReady shows them up front and quietly enforces the ones that matter."
    >
      <h2>The four policies</h2>
      <p>
        Set your wording under <strong>Website → Content</strong> (or from the
        Policies step in the setup wizard). You get four:
      </p>
      <ul>
        <li><strong>Cancellation</strong> — how much notice you need, and what happens if it&rsquo;s short.</li>
        <li><strong>No-show</strong> — what happens when a client doesn&rsquo;t turn up.</li>
        <li><strong>Late arrival</strong> — your grace period and what happens past it.</li>
        <li><strong>Deposit</strong> — whether a deposit is required and if it&rsquo;s refundable.</li>
      </ul>
      <p>
        We pre-fill sensible defaults — tweak the wording so it sounds like you.
        These appear on your booking page and in confirmation emails, so there
        are no surprises.
      </p>

      <h2>Cancellation &amp; reschedule windows</h2>
      <p>
        Beyond the wording, you set the <strong>rules</strong> that BookReady
        actually enforces, under <strong>Settings → Booking</strong>:
      </p>
      <ul>
        <li><strong>Cancellation window</strong> — how many hours before an appointment a client can still cancel themselves.</li>
        <li><strong>Reschedule window</strong> — the same idea for moving an appointment.</li>
      </ul>
      <p>
        Inside the window, clients can self-serve. Outside it, the option is
        locked and they have to contact you — so nobody cancels twenty minutes
        before their slot.
      </p>

      <div className="help-note">
        <p><strong>How clients manage their booking</strong></p>
        <p>Every confirmation email has a secure link. Clients use it to cancel or reschedule — no account or password needed — and the windows above decide what they&rsquo;re allowed to do.</p>
      </div>

      <h2>Deposits as enforcement</h2>
      <p>
        Policies set expectations; deposits give them teeth. A required deposit
        (see <a href="/help/payments">Payments &amp; Stripe</a>) means a no-show
        actually costs the client something — which means far fewer no-shows. Your
        deposit policy text should make this clear.
      </p>

      <h2>Preventing duplicate bookings</h2>
      <p>
        You can stop the same client from holding multiple overlapping bookings —
        useful if people &ldquo;book to be safe&rdquo; and forget to cancel. Find
        it in <strong>Settings → Booking</strong>.
      </p>

      <h2>A note on tone</h2>
      <p>
        The best policies are firm but warm. &ldquo;Life happens — just give us 24
        hours&rdquo; lands better than a wall of penalties, and still protects your
        calendar. Write them the way you&rsquo;d say them to a regular.
      </p>
    </HelpArticle>
  )
}
