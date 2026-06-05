import type { Metadata } from 'next'
import HelpArticle from '@/components/help/HelpArticle'

export const metadata: Metadata = {
  title: 'Payments & Stripe — BookReady Help',
  description: 'Connect Stripe, take deposits, see payouts, and issue refunds on BookReady.',
}

export default function Page() {
  return (
    <HelpArticle
      slug="payments"
      intro="BookReady uses Stripe to handle money safely — deposits at booking, payments, and payouts straight to your bank. Here's how it fits together."
    >
      <h2>Connecting Stripe</h2>
      <p>
        Go to <strong>Settings → Payments</strong> (or <strong>Payments</strong>{' '}
        in the main menu) and click <strong>Connect Stripe</strong>. You&rsquo;ll
        set up — or sign in to — a Stripe account, which takes a few minutes.
        BookReady never sees or stores card numbers; Stripe handles all of that.
      </p>
      <p>Your connection moves through a few states:</p>
      <ul>
        <li><strong>Not connected</strong> — you haven&rsquo;t started yet.</li>
        <li><strong>Pending</strong> — Stripe is verifying your details.</li>
        <li><strong>Active</strong> — you&rsquo;re ready to take payments.</li>
        <li><strong>Restricted</strong> — Stripe needs more information; follow their prompt to fix it.</li>
      </ul>

      <div className="help-note">
        <p><strong>You can launch without it</strong></p>
        <p>Stripe is optional. You can take bookings without deposits and add payments later — but deposits are the single best tool against no-shows.</p>
      </div>

      <h2>Deposits</h2>
      <p>
        Once Stripe is active, you can require a <strong>deposit</strong> at
        booking — a fixed amount or a percentage, set per service. The client pays
        the deposit to confirm; the rest is due at the appointment. Even a small
        deposit makes people show up.
      </p>

      <h2>The balance &amp; tips</h2>
      <p>
        After the appointment you can charge the remaining balance, and clients
        can leave a tip. BookReady can email the client a secure link to pay their
        balance or tip — no awkward in-person card fumbling.
      </p>

      <h2>Payouts</h2>
      <p>
        Money from your clients goes to <strong>your</strong> Stripe account and is
        paid out to your bank on Stripe&rsquo;s normal schedule (typically every
        couple of days). The <strong>Payments → Payouts</strong> tab shows what&rsquo;s
        on the way. BookReady is just the technology in the middle — you are the
        merchant of record for your clients&rsquo; payments.
      </p>

      <h2>Transactions &amp; refunds</h2>
      <p>
        The <strong>Transactions</strong> tab lists every payment with its status.
        To refund a client, open the appointment or transaction and choose{' '}
        <strong>Refund</strong> — full or partial. Refunds go back to the
        client&rsquo;s original card through Stripe.
      </p>

      <h2>Two kinds of payments — don&rsquo;t mix them up</h2>
      <p>
        Everything on this page is about <strong>your clients paying you</strong>.
        That&rsquo;s separate from <strong>your BookReady subscription</strong>{' '}
        (what you pay us to use the platform) — that lives under Billing. See{' '}
        <a href="/help/your-plan-and-billing">Your plan &amp; billing</a>.
      </p>
    </HelpArticle>
  )
}
