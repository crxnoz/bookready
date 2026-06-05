import type { Metadata } from 'next'
import LegalShell from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Subscription & Billing Terms — BookReady',
  description: 'How BookReady subscriptions, billing, and renewals work.',
}

export default function BillingTermsPage() {
  return (
    <LegalShell eyebrow="Legal" title="Subscription & Billing Terms" effectiveDate="May 27, 2026">
      <p>
        These Subscription &amp; Billing Terms (the &ldquo;<strong>Billing Terms</strong>&rdquo;)
        govern the financial side of your relationship with DaysGraphic LLC,
        the company that operates the BookReady platform
        (&ldquo;<strong>we</strong>,&rdquo;{' '}
        &ldquo;<strong>us</strong>,&rdquo; or &ldquo;<strong>our</strong>&rdquo;),
        and explain how subscriptions to BookReady are billed,
        renewed, and cancelled. These Billing Terms are part of and incorporated
        into our Terms of Service. By subscribing to BookReady, you agree to
        these Billing Terms.
      </p>

      <h2 id="plans">1. Subscription plans</h2>
      <p>
        BookReady is offered as a paid subscription Service with multiple plan
        tiers (for example, Starter, Pro, and Business). Each plan includes a
        defined set of features, usage allowances (such as included SMS
        messages, staff seats, and storage), and a published price. The
        current plans and prices are listed on our pricing page.
      </p>
      <p>
        We may add, change, rename, retire, or restructure plans at any time.
        If a change materially reduces what your current plan includes, we will
        give you reasonable notice before the change takes effect at your next
        renewal.
      </p>

      <h2 id="billing-cycles">2. Billing cycles</h2>
      <p>
        BookReady subscriptions are available in <strong>monthly</strong>,{' '}
        <strong>quarterly</strong>, and <strong>annual</strong> billing
        cycles. Annual and quarterly cycles are typically offered at a
        discount compared to monthly. The billing cycle you select at signup
        determines how often you are charged and the term of your subscription.
      </p>

      <h2 id="renewal">3. Auto-renewal</h2>
      <p>
        <strong>
          Your subscription will automatically renew at the end of each
          billing cycle for another period of the same length, at the
          then-current price for that plan, unless you cancel before the
          renewal date.
        </strong>{' '}
        We will attempt to charge the payment method on file for the renewal
        amount on or shortly before the renewal date. If you do not want your
        subscription to renew, you must cancel before the renewal date as
        described in Section 8.
      </p>

      <h2 id="payment">4. Payment method</h2>
      <p>
        You must provide a valid payment method (credit card, debit card, or
        other method we accept) at the time of subscription and keep it
        current. By providing a payment method, you authorize us, and our
        payment processor on our behalf, to charge that method for all amounts
        due under these Billing Terms, including initial fees, recurring
        renewal fees, applicable taxes, usage overages, and any other charges
        you incur.
      </p>
      <p>
        You are responsible for keeping your billing details (card number,
        expiration date, billing address) accurate and up to date. You can
        update your payment method at any time from your account settings.
      </p>

      <h2 id="failed">5. Failed payments and past-due accounts</h2>
      <p>
        If a renewal or other charge fails — because your card is expired,
        declined, over its limit, or for any other reason — we may retry the
        charge over a period of several days and notify you by email so you
        can update your payment method. If we are unable to collect payment,
        your account may be downgraded, suspended, or terminated, and access
        to the Services and the data stored in your account may be restricted.
      </p>
      <p>
        You remain responsible for any amounts that accrue before suspension
        or termination, including any usage charges (such as SMS overages)
        that have not yet been billed.
      </p>

      <h2 id="suspension">6. Suspension and termination for non-payment</h2>
      <p>
        We may suspend your access to the Services if your account is past due.
        If your account remains past due, we may permanently terminate it
        and, after a reasonable retention period, delete the data associated
        with the account. Restoring a terminated account is at our sole
        discretion and may require payment of all outstanding amounts.
      </p>

      <h2 id="price-changes">7. Price changes</h2>
      <p>
        We may change subscription prices from time to time. If we increase
        the price of your current plan, we will give you at least{' '}
        <strong>30 days&rsquo; notice</strong> by email or in-app message
        before the new price takes effect at your next renewal. If you do not
        want to renew at the new price, you may cancel before the change
        becomes effective. Continuing your subscription after the effective
        date constitutes acceptance of the new price.
      </p>

      <h2 id="cancellation">8. How to cancel</h2>
      <p>
        You can cancel your subscription at any time from your account
        settings or by emailing{' '}
        <a href="mailto:hello@mybookready.com">hello@mybookready.com</a> from
        the email address on the account. Cancellation takes effect at the end
        of your current paid period — your access continues through that
        period and is not renewed at the next cycle.
      </p>
      <p>
        Cancellation stops future charges but{' '}
        <strong>does not refund amounts already paid</strong>. See our{' '}
        <a href="/refund">Refund Policy</a> for refund eligibility.
      </p>

      <h2 id="overage">9. SMS overage and other usage charges</h2>
      <p>
        Your plan includes a monthly allowance of SMS messages and other
        usage-based features. SMS messages sent in excess of your monthly
        allowance are billed at the published per-message overage rate for
        your plan, in addition to your subscription fee.
      </p>
      <p>
        Overage charges accrue during the billing period in which they are
        used and are billed on your next regular invoice. By enabling SMS
        sending in your account, you authorize us to charge your payment
        method for any overage amounts you incur. Usage charges are
        non-refundable once delivered.
      </p>

      <h2 id="taxes">10. Taxes</h2>
      <p>
        Subscription fees are exclusive of any sales, use, value-added,
        goods-and-services, or similar taxes. If we are required by law to
        collect such taxes on a transaction, we will add them to the amount
        we charge. You are responsible for any taxes payable on amounts you
        receive from your own customers through the Services.
      </p>

      <h2 id="currency">11. Currency</h2>
      <p>
        Unless we display otherwise at checkout, subscription fees are quoted
        and charged in <strong>U.S. Dollars (USD)</strong>. If your payment
        method is denominated in a different currency, your bank or card
        issuer may charge a currency-conversion fee. Such fees are between you
        and your bank.
      </p>

      <h2 id="processor">12. Payment processor</h2>
      <p>
        Subscription payments are processed by{' '}
        <strong>DaysGraphic LLC</strong> through Stripe, Inc.
        (&ldquo;Stripe&rdquo;) as our payment processor. Use of Stripe is
        subject to Stripe&rsquo;s terms and privacy policy. We do not store
        full card numbers on our own systems — payment details are tokenized
        and stored securely by Stripe.
      </p>

      <h2 id="connect">13. Stripe Connect (your client payments)</h2>
      <p>
        BookReady also lets you accept payments from your own clients through
        Stripe Connect. Those payments flow directly to your Stripe account,
        not to DaysGraphic LLC. You are the merchant of record for those
        transactions; DaysGraphic LLC is only the technology platform that
        facilitates them. Stripe&rsquo;s Connected Account Agreement and Stripe
        Services Agreement govern those payments. Any processing fees,
        platform fees, refunds, chargebacks, and reserves associated with
        those payments are your responsibility.
      </p>

      <h2 id="refunds">14. Refunds</h2>
      <p>
        Refunds, when available, are governed by our{' '}
        <a href="/refund">Refund Policy</a>. Please review it before
        subscribing.
      </p>

      <h2 id="chargebacks">15. Chargebacks and disputes</h2>
      <p>
        If you believe you have been charged in error, please contact us at{' '}
        <a href="mailto:hello@mybookready.com">hello@mybookready.com</a>{' '}
        before disputing the charge with your bank or card issuer so we can
        try to resolve it directly. Initiating a chargeback without first
        contacting us may result in suspension or termination of your account.
        We reserve the right to dispute any chargeback we believe is
        unwarranted and to recover related costs from you.
      </p>

      <h2 id="promo">16. Promotional pricing and discounts</h2>
      <p>
        From time to time we may offer promotional pricing, discounts, or
        coupon codes. Unless otherwise stated, promotional pricing applies
        only to the initial billing period and reverts to the standard price
        on the next renewal. Promotions are non-transferable, cannot be
        combined unless we expressly say so, and may be withdrawn at any time.
      </p>

      <h2 id="changes">17. Changes to these Billing Terms</h2>
      <p>
        We may update these Billing Terms from time to time. Material changes
        will be communicated by email or through the Services with reasonable
        notice. The version in effect on the date of your next renewal applies
        to that renewal.
      </p>

      <h2 id="contact">18. Contact us</h2>
      <p>
        Questions about these Billing Terms can be sent to:
      </p>
      <p>
        <strong>DaysGraphic LLC</strong><br />
        Operator of the BookReady platform<br />
        Email:{' '}
        <a href="mailto:hello@mybookready.com">hello@mybookready.com</a>
      </p>
    </LegalShell>
  )
}
