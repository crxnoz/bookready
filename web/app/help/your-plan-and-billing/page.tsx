import type { Metadata } from 'next'
import HelpArticle from '@/components/help/HelpArticle'

export const metadata: Metadata = {
  title: 'Your plan & billing — BookReady Help',
  description: 'Your free trial, plans, changing or cancelling, and the billing portal on BookReady.',
}

export default function Page() {
  return (
    <HelpArticle
      slug="your-plan-and-billing"
      intro="This is about your BookReady subscription — what you pay us to run your booking business. (Money your clients pay you is separate; that's under Payments.)"
    >
      <h2>Your free trial</h2>
      <p>
        Every account starts with a <strong>14-day free trial</strong>. Your site
        is fully live the whole time and you can take real bookings. We ask for a
        card up front so there&rsquo;s no interruption when the trial ends — but
        you&rsquo;re not charged until day 14, and we email you before that
        happens.
      </p>

      <div className="help-note">
        <p><strong>Didn&rsquo;t add a card yet?</strong></p>
        <p>You can keep exploring during the trial and add your card any time from Billing. To keep your site live past day 14, add it before the trial ends.</p>
      </div>

      <h2>Plans</h2>
      <p>
        BookReady comes in a few plans — <strong>Solo</strong>,{' '}
        <strong>Studio</strong>, and <strong>Salon</strong> — sized for solo pros
        up to bigger teams. They differ in limits and included extras; the core
        booking experience is the same on all of them. You can compare them on the
        plan picker in Billing.
      </p>

      <h2>Choosing or changing your plan</h2>
      <p>
        Open <strong>Billing</strong> from the main menu. Pick a plan and a billing
        cycle — <strong>monthly</strong> or <strong>annual</strong> (annual saves
        you money). You can upgrade or downgrade any time; changes take effect from
        your next cycle.
      </p>

      <h2>The billing portal</h2>
      <p>
        For anything to do with your card, invoices, or receipts, use the{' '}
        <strong>billing portal</strong> — a secure page hosted by Stripe, linked
        from your Billing screen. There you can:
      </p>
      <ul>
        <li>Update your card.</li>
        <li>Download past invoices and receipts.</li>
        <li>See your next charge date.</li>
        <li>Cancel your subscription.</li>
      </ul>

      <h2>Cancelling</h2>
      <p>
        You can cancel any time from the billing portal — no phone call, no
        hoops. Your account stays active until the end of the period you&rsquo;ve
        already paid for. See our <a href="/refund">Refund Policy</a> for how
        refunds work.
      </p>

      <h2>Questions about a charge?</h2>
      <p>
        Email <a href="mailto:hello@mybookready.com">hello@mybookready.com</a> and
        we&rsquo;ll sort it out. Billing questions get a fast reply.
      </p>
    </HelpArticle>
  )
}
