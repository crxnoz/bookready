import type { Metadata } from 'next'
import LegalShell from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Refund Policy — BookReady',
  description: 'How BookReady handles refunds for subscription fees.',
}

export default function RefundPage() {
  return (
    <LegalShell eyebrow="Legal" title="Refund Policy" effectiveDate="May 27, 2026">
      <p>
        This Refund Policy describes the circumstances under which DaysGraphic
        LLC (doing business as BookReady, &ldquo;<strong>we</strong>,&rdquo;{' '}
        &ldquo;<strong>us</strong>,&rdquo; or &ldquo;<strong>our</strong>&rdquo;)
        will issue refunds for fees paid in connection with your use of the
        BookReady platform (the &ldquo;<strong>Services</strong>&rdquo;). By
        purchasing or renewing a subscription, you agree to the terms of this
        policy.
      </p>

      <h2 id="scope">1. What this policy covers</h2>
      <p>
        This Refund Policy applies <strong>only to subscription fees</strong>{' '}
        paid by you directly to DaysGraphic LLC for access to the BookReady
        platform. It does not cover:
      </p>
      <ul>
        <li>
          Payments your clients make to your business for appointments, deposits,
          tips, or other goods and services billed through BookReady (those are
          governed by your own business policies — see Section 7 below).
        </li>
        <li>
          Fees charged by third parties such as Stripe, Telnyx, Resend, or any
          payment-processing, SMS, or email provider, which are non-refundable
          by us.
        </li>
        <li>
          Taxes, surcharges, or carrier pass-through fees, which we collect on
          behalf of taxing authorities or service providers and do not retain.
        </li>
      </ul>

      <h2 id="general">2. General refund stance</h2>
      <p>
        BookReady subscriptions are generally <strong>non-refundable</strong>{' '}
        once paid. We make this clear at the point of purchase so you can make
        an informed decision before subscribing. We may, at our sole discretion,
        issue refunds in the specific circumstances described below.
      </p>

      <h2 id="trial">3. Free trial period</h2>
      <p>
        Where we offer a free trial, you will not be charged during the trial
        period. If you do not cancel before the trial ends, your subscription
        will begin automatically at the plan and billing cycle you selected. Any
        charges incurred after the trial ends are subject to the same refund
        terms as paid subscriptions described in this policy.
      </p>

      <h2 id="monthly">4. Monthly subscriptions</h2>
      <p>
        Monthly subscription fees are billed in advance for the upcoming month
        of service. If you cancel during a paid month, you will retain access
        until the end of that billing period, but the month already paid is{' '}
        <strong>not refundable</strong>, in whole or in part, including any
        partial month of unused service.
      </p>

      <h2 id="annual">5. Annual and quarterly subscriptions</h2>
      <p>
        Annual and quarterly subscriptions are billed in advance for the full
        billing term. We offer a{' '}
        <strong>7-day satisfaction window</strong> on the first annual or
        quarterly term: if you cancel within 7 days of the initial purchase and
        have not yet used the Services to take a paid customer booking through
        Stripe Connect, you may request a full refund of the prepaid amount.
      </p>
      <p>
        After the 7-day window, prepaid annual and quarterly amounts are{' '}
        <strong>non-refundable</strong>. If you cancel later in the term, you
        will retain access through the end of the prepaid period but will not
        receive a prorated refund for unused months. Renewals of annual or
        quarterly subscriptions are not eligible for the 7-day satisfaction
        window — only the initial purchase qualifies.
      </p>

      <h2 id="cancellation">6. Cancellation is not the same as a refund</h2>
      <p>
        Cancelling your subscription stops future charges but does not refund
        amounts already billed. You may cancel at any time from your account
        settings or by emailing us. Your access continues through the end of
        the period you have already paid for, after which the subscription
        ends and your account becomes inactive in accordance with our Terms of
        Service.
      </p>

      <h2 id="client-payments">7. Payments your clients make are not covered</h2>
      <p>
        BookReady allows you to accept deposits, full payments, tips, no-show
        fees, and other charges from your clients using Stripe Connect. Those
        amounts are collected by Stripe on your behalf and paid into your
        connected Stripe account. <strong>BookReady does not hold or refund
        those funds.</strong>
      </p>
      <p>
        If a client requests a refund for an appointment payment, deposit, tip,
        or fee, you must handle that refund yourself through your Stripe
        dashboard or through the refund tools available in the BookReady editor.
        Your own refund and cancellation policies govern those transactions —
        not this policy.
      </p>

      <h2 id="how">8. How to request a refund</h2>
      <p>
        To request a refund of BookReady subscription fees under the
        circumstances described above, contact us at{' '}
        <a href="mailto:hello@mybookready.com">hello@mybookready.com</a> from
        the email address associated with your account, within the applicable
        time window, and include:
      </p>
      <ul>
        <li>The email address associated with your BookReady account.</li>
        <li>The date and approximate amount of the charge.</li>
        <li>The reason you are requesting a refund.</li>
      </ul>
      <p>
        We may ask for additional information to verify your identity and
        evaluate your request. We typically respond to refund requests within
        5 business days.
      </p>

      <h2 id="processing">9. How long refunds take</h2>
      <p>
        Approved refunds are processed to the original payment method used at
        purchase. Most refunds appear in your account within{' '}
        <strong>5 to 10 business days</strong> after we issue them, though the
        exact timing depends on your bank or card issuer. We are not responsible
        for delays caused by your payment provider.
      </p>

      <h2 id="exceptions">10. Exceptions and special circumstances</h2>
      <p>
        We may, in our sole discretion, grant a refund outside the terms of
        this policy in limited circumstances such as:
      </p>
      <ul>
        <li>
          A confirmed prolonged service outage that materially prevented you
          from using the Services.
        </li>
        <li>A duplicate or accidental charge attributable to BookReady.</li>
        <li>
          A billing error caused by our systems and confirmed by our records.
        </li>
      </ul>
      <p>
        Granting an exception in one case does not obligate us to grant a
        similar exception in any other case.
      </p>

      <h2 id="chargebacks">11. Chargebacks and disputes</h2>
      <p>
        Before disputing a charge with your bank or card issuer, please contact
        us at{' '}
        <a href="mailto:hello@mybookready.com">hello@mybookready.com</a> so we
        can attempt to resolve the issue directly. Initiating a chargeback
        without first contacting us may result in suspension or termination of
        your account in accordance with our Terms of Service. We reserve the
        right to dispute any chargeback that we believe to be unwarranted under
        this policy.
      </p>

      <h2 id="suspended">12. Refunds are not issued for terminated accounts</h2>
      <p>
        If we terminate or suspend your account for cause — for example, for
        violation of our Terms of Service, abuse of the Services, or
        non-payment — you are not entitled to a refund of any subscription
        fees, in whole or in part.
      </p>

      <h2 id="changes">13. Changes to this policy</h2>
      <p>
        We may update this Refund Policy from time to time to reflect changes
        in our practices, the Services, or applicable law. We will post the
        updated policy with a new effective date at the top of this page. The
        version in effect on the date you make a purchase governs that
        purchase.
      </p>

      <h2 id="contact">14. Contact us</h2>
      <p>
        Questions about this Refund Policy can be sent to:
      </p>
      <p>
        <strong>DaysGraphic LLC</strong><br />
        d/b/a BookReady<br />
        Email:{' '}
        <a href="mailto:hello@mybookready.com">hello@mybookready.com</a>
      </p>
    </LegalShell>
  )
}
