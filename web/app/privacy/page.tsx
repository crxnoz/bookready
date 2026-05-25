import type { Metadata } from 'next'
import LegalShell from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Privacy Policy — BookReady',
  description: 'How BookReady collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <LegalShell eyebrow="Legal" title="Privacy Policy" effectiveDate="May 24, 2026">
      <p>
        BookReady is a booking-website and appointment-management tool for beauty
        professionals. We try to keep this policy plain enough that you can actually
        read it. If anything is unclear, email{' '}
        <a href="mailto:hello@mybookready.com">hello@mybookready.com</a> and we will explain.
      </p>

      <h2>Who this applies to</h2>
      <p>
        This policy covers the BookReady product — the editor at{' '}
        <code>app.bkrdy.me</code>, the public booking sites we host on{' '}
        <code>*.bkrdy.me</code> subdomains, and the API at{' '}
        <code>api.bkrdy.me</code>.
      </p>
      <p>
        Two groups of people use BookReady, and we collect different things from each:
      </p>
      <ul>
        <li>
          <strong>Business owners</strong> — the people who sign up, build their site,
          and manage their bookings.
        </li>
        <li>
          <strong>Booking customers</strong> — the end clients who book appointments
          on a business owner&rsquo;s public site.
        </li>
      </ul>
      <p>
        If you are a booking customer, the business you booked with is responsible for
        how they handle your information. BookReady stores it on their behalf.
      </p>

      <h2>What we collect</h2>

      <h3>From business owners</h3>
      <ul>
        <li>
          <strong>Account details</strong>: name, email, password (hashed — we never
          see your plain password).
        </li>
        <li>
          <strong>Business profile</strong>: business name, address, phone, hours,
          services, staff, photos you upload, policies you write.
        </li>
        <li>
          <strong>Subscription data</strong>: handled by Stripe — we store a customer
          ID and subscription status, never card numbers.
        </li>
        <li>
          <strong>Stripe Connect account ID</strong> if you connect Stripe to accept
          customer payments. Payouts go directly from Stripe to your bank — BookReady
          never holds your money.
        </li>
        <li>
          <strong>Sign-in via Google</strong> (optional): if you use &ldquo;Continue
          with Google,&rdquo; we receive your email, name, and Google profile picture.
          We do not access Gmail, Drive, or anything else.
        </li>
      </ul>

      <h3>From booking customers</h3>
      <ul>
        <li>Name, email, phone number (so the business can confirm the appointment).</li>
        <li>The service, staff, date, and time of the appointment.</li>
        <li>Any notes you write for the business.</li>
        <li>
          If a deposit is required: payment is processed by Stripe directly. BookReady
          never sees or stores card numbers.
        </li>
      </ul>

      <h3>Automatically</h3>
      <ul>
        <li>Standard server logs (IP, browser type, URLs requested, timestamps).</li>
        <li>
          A small number of essential cookies and localStorage entries — auth token,
          tenant ID, template choice during signup. We do not use advertising or
          cross-site tracking cookies.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>Run the product — sign you in, show your dashboard, render your site.</li>
        <li>Send transactional email (account changes, booking confirmations, reminders, receipts) via Resend.</li>
        <li>Bill subscriptions and process customer payments via Stripe.</li>
        <li>Debug problems and improve the product.</li>
        <li>Prevent abuse and respond to legal requests when we must.</li>
      </ul>
      <p>
        We do <strong>not</strong> sell your data. We do not share it with advertisers.
        We do not train AI models on customer booking records.
      </p>

      <h2>Who we share it with</h2>
      <p>
        BookReady is run by a small team and relies on a few well-known sub-processors
        to operate. Each one only sees what they need:
      </p>
      <ul>
        <li>
          <strong>Stripe</strong> — subscription billing and Stripe Connect for
          customer payments. Card data goes directly to Stripe.
        </li>
        <li>
          <strong>Resend</strong> — transactional email delivery (confirmations,
          reminders, password resets, receipts).
        </li>
        <li>
          <strong>Cloudflare R2</strong> — object storage for the photos, gallery
          images, and other media you upload.
        </li>
        <li>
          <strong>Google</strong> — only if you choose &ldquo;Sign in with Google.&rdquo;
          We use the OAuth scopes <code>openid</code>, <code>profile</code>, and{' '}
          <code>email</code>.
        </li>
        <li>
          <strong>DigitalOcean</strong> — the cloud host that runs our servers and
          databases.
        </li>
      </ul>
      <p>
        We will hand over data if compelled by valid legal process. We will tell you
        first when we are legally allowed to.
      </p>

      <h2>Where data lives</h2>
      <p>
        Our servers run in DigitalOcean&rsquo;s United States region. Stripe, Resend,
        and Cloudflare each run their own global infrastructure. By using BookReady
        you agree to your information being processed in the United States.
      </p>

      <h2>How long we keep things</h2>
      <ul>
        <li>
          <strong>Account &amp; business data</strong>: while your subscription is
          active, plus a short grace window after cancellation in case you come back.
        </li>
        <li>
          <strong>Booking customer records</strong>: kept as part of the business&rsquo;
          tenant — they decide when to delete them.
        </li>
        <li>
          <strong>Payment records</strong>: Stripe retains transaction history per
          their own terms.
        </li>
        <li>
          <strong>Server logs</strong>: rotated regularly, retained for at most 90 days.
        </li>
      </ul>
      <p>
        If you delete your account, we delete the tenant database, uploaded media, and
        related auth tokens. Stripe billing history remains in Stripe.
      </p>

      <h2>Your rights</h2>
      <p>
        You can edit most of your information directly in the editor at{' '}
        <code>app.bkrdy.me</code> — name, email, password, business details, photos.
      </p>
      <p>
        You can also email <a href="mailto:hello@mybookready.com">hello@mybookready.com</a> to:
      </p>
      <ul>
        <li>Ask what we have about you.</li>
        <li>Correct something that is wrong.</li>
        <li>Delete your account and tenant data.</li>
        <li>Export your data.</li>
      </ul>
      <p>
        Booking customers: contact the business you booked with for changes. We will
        help if needed.
      </p>

      <h2>Security</h2>
      <p>
        We use HTTPS everywhere, hash passwords with bcrypt, store tokens as Sanctum
        bearer tokens, and isolate each business&rsquo; data in a separate per-tenant
        database. Card numbers never touch our servers — they go to Stripe directly.
        No system is bulletproof; we patch quickly and disclose breaches honestly.
      </p>

      <h2>Children</h2>
      <p>
        BookReady is for businesses. We do not knowingly collect information from
        children under 13. If we learn we have, we will delete it.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we make material changes we will email account owners and update the
        &ldquo;Effective&rdquo; date above. Minor edits (typos, clarifications) we
        just push.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or anything we hold about you:{' '}
        <a href="mailto:hello@mybookready.com">hello@mybookready.com</a>.
      </p>
    </LegalShell>
  )
}
