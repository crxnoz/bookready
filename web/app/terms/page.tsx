import type { Metadata } from 'next'
import LegalShell from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Terms of Service — BookReady',
  description: 'The terms that govern your use of BookReady.',
}

export default function TermsPage() {
  return (
    <LegalShell eyebrow="Legal" title="Terms of Service" effectiveDate="May 24, 2026">
      <p>
        These terms cover your use of BookReady. By signing up or using the service
        you agree to them. We will keep the language as plain as we can.
      </p>

      <h2>1. What BookReady is</h2>
      <p>
        BookReady is a software service that lets beauty businesses build a public
        booking website, manage appointments, accept deposits and payments through
        Stripe, and communicate with their clients. We host the site at a subdomain
        of <code>bkrdy.me</code>. We are a tool, not a marketplace — bookings happen
        directly between you and your clients.
      </p>

      <h2>2. Eligibility &amp; accounts</h2>
      <p>
        You need to be at least 18 and able to enter a contract. You are responsible
        for everything that happens under your account, including keeping your
        password safe. Tell us right away at{' '}
        <a href="mailto:hello@bkrdy.me">hello@bkrdy.me</a> if you think your account
        has been used without your permission.
      </p>
      <p>
        One account per person and per business. Don&rsquo;t impersonate someone else
        or sign up under a fake business name.
      </p>

      <h2>3. Subscriptions &amp; billing</h2>
      <p>
        BookReady is a paid subscription service. Plans, prices, and trial terms are
        shown at signup. We bill through Stripe.
      </p>
      <ul>
        <li>
          Subscriptions renew automatically until you cancel from the editor or by
          emailing us.
        </li>
        <li>
          Fees are non-refundable except where required by law. If we mess up,
          we&rsquo;ll make it right — just ask.
        </li>
        <li>
          We may change prices with at least 30 days notice. Existing subscribers see
          the new price at the next renewal.
        </li>
        <li>
          If a payment fails we may suspend access until it is resolved.
        </li>
      </ul>

      <h2>4. Customer payments via Stripe Connect</h2>
      <p>
        If you accept deposits or full payments from your clients, those payments
        flow through your own Stripe Connect account. Payouts go from Stripe directly
        to your bank. BookReady never holds your customers&rsquo; money.
      </p>
      <ul>
        <li>
          You are responsible for your Stripe account standing — verification,
          documents, accurate bank details.
        </li>
        <li>
          Refund and chargeback rules are governed by Stripe and the card networks.
          We can help you find the right buttons, but the refund decision is yours.
        </li>
        <li>
          Taxes, fees, and your own pricing are your responsibility.
        </li>
      </ul>

      <h2>5. Your content</h2>
      <p>
        Everything you put into BookReady — photos, descriptions, policies, your
        services, your client list — stays yours. You give us permission to host
        and display it so the product works (e.g. showing your photos on your
        public site, sending an email to your client).
      </p>
      <p>
        You promise that you have the right to upload it. Don&rsquo;t upload other
        people&rsquo;s copyrighted work without permission. Don&rsquo;t upload
        anything illegal.
      </p>

      <h2>6. Your client data</h2>
      <p>
        Booking customer information (names, contact info, appointment history) is
        held in your tenant database. You are the controller of that data. You
        agree to:
      </p>
      <ul>
        <li>Use it only to run your business.</li>
        <li>Honor your own privacy commitments to your clients.</li>
        <li>Respond to your clients&rsquo; reasonable requests about their data.</li>
      </ul>

      <h2>7. Acceptable use</h2>
      <p>Don&rsquo;t:</p>
      <ul>
        <li>Use BookReady for anything illegal, harmful, or fraudulent.</li>
        <li>
          Send spam, harassment, deceptive offers, or content involving minors in
          beauty services they shouldn&rsquo;t be in.
        </li>
        <li>Try to break into, scrape, reverse-engineer, or overload the service.</li>
        <li>Sell or sublicense access to your account.</li>
        <li>Use BookReady to compete by copying our product wholesale.</li>
      </ul>
      <p>
        We can suspend or terminate accounts that violate these rules — usually with
        warning, but immediately if the violation is severe.
      </p>

      <h2>8. Availability &amp; changes</h2>
      <p>
        We aim for high uptime but the service is provided &ldquo;as is.&rdquo;
        Things break sometimes. We will work hard to fix them quickly. We may
        change features, deprecate things, or evolve the product over time —
        we&rsquo;ll communicate major changes through the editor or by email.
      </p>

      <h2>9. Cancellation &amp; deletion</h2>
      <p>
        You can cancel anytime from Account Settings. Cancellation stops future
        charges; access continues through the end of the paid period.
      </p>
      <p>
        If you ask us to delete your account, we will delete your tenant database,
        uploaded media, and credentials within a reasonable window. Stripe billing
        history remains in Stripe per their terms.
      </p>
      <p>
        We can terminate accounts that violate these terms, are inactive for an
        extended period, or that we are legally required to remove.
      </p>

      <h2>10. Disclaimer &amp; liability</h2>
      <p>
        BookReady is provided <strong>&ldquo;as is&rdquo;</strong> and{' '}
        <strong>&ldquo;as available&rdquo;</strong>, without warranties of any kind,
        express or implied, including merchantability, fitness for a particular
        purpose, and non-infringement.
      </p>
      <p>
        To the maximum extent allowed by law, BookReady&rsquo;s total liability for
        any claim arising out of or relating to the service is limited to the
        amount you paid us in the twelve months before the claim. We are not liable
        for lost profits, lost data, lost goodwill, or other indirect or
        consequential damages.
      </p>

      <h2>11. Indemnification</h2>
      <p>
        You agree to defend and hold BookReady harmless from claims brought by your
        clients or third parties arising from your business, your content, your
        use of the service, or your violation of these terms.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These terms are governed by the laws of the State of Florida, USA, without
        regard to conflict-of-laws principles. Disputes go to the state or federal
        courts located in Florida, and both sides consent to that jurisdiction.
      </p>

      <h2>13. Changes to these terms</h2>
      <p>
        We may update these terms over time. Material changes will be announced by
        email to account owners and by updating the &ldquo;Effective&rdquo; date
        above. Continuing to use BookReady after the change means you accept the
        new terms.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions? <a href="mailto:hello@bkrdy.me">hello@bkrdy.me</a>.
      </p>
    </LegalShell>
  )
}
