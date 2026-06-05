import type { Metadata } from 'next'
import HelpArticle from '@/components/help/HelpArticle'

export const metadata: Metadata = {
  title: 'Services & pricing — BookReady Help',
  description: 'Add services, categories, add-ons, durations, deposits, and buffer times on BookReady.',
}

export default function Page() {
  return (
    <HelpArticle
      slug="services-and-pricing"
      intro="Services are what clients book. Each one carries a name, price, and how long it takes — and a few options that quietly make your day run smoother."
    >
      <h2>Adding a service</h2>
      <p>
        Go to <strong>Services</strong> from the main menu and add one for each
        thing you offer. Every service needs three things:
      </p>
      <ul>
        <li><strong>Name</strong> — what clients see (e.g. &ldquo;Color &amp; Cut&rdquo;).</li>
        <li><strong>Price</strong> — what it costs.</li>
        <li><strong>Duration</strong> — how long it takes, so your calendar blocks the right amount of time.</li>
      </ul>
      <p>
        A short description helps too — it shows on your booking page under the
        service name.
      </p>

      <div className="help-note">
        <p><strong>Keep your menu tight</strong></p>
        <p>A handful of clear, well-priced services books better than a long list. Group variations with add-ons instead of separate services.</p>
      </div>

      <h2>Categories</h2>
      <p>
        If you offer a lot, group services into <strong>categories</strong> (e.g.
        &ldquo;Hair,&rdquo; &ldquo;Color,&rdquo; &ldquo;Treatments&rdquo;) so your
        booking page stays organized. Categories are optional — skip them if your
        menu is short.
      </p>

      <h2>Add-ons</h2>
      <p>
        Add-ons are extras a client can tack onto a service — a deep-conditioning
        treatment, a longer session, a touch-up. Create an add-on once, then link
        it to any services it applies to. Each link can be <strong>optional</strong>{' '}
        (the client chooses) or <strong>required</strong> (always included). Add-ons
        carry their own price and time, which get added to the booking total and
        duration automatically.
      </p>

      <h2>Deposits per service</h2>
      <p>
        If you&rsquo;ve connected Stripe, you can require a deposit at booking.
        Deposits dramatically reduce no-shows — even a small one signals
        commitment. Set this per service so a quick $30 trim and a 3-hour color
        can have different rules. (See <a href="/help/payments">Payments &amp; Stripe</a>.)
      </p>

      <h2>Buffers &amp; availability</h2>
      <p>
        Each service can carry a <strong>buffer</strong> — extra time before or
        after that clients can&rsquo;t book into. Use it for cleanup, setup, or a
        breather. You can also limit a service to certain days or certain staff if
        not everyone offers everything. Leave these blank to inherit your normal
        hours.
      </p>

      <h2>Hiding vs deleting</h2>
      <p>
        Toggle a service <strong>inactive</strong> to take it off your booking page
        without losing it — handy for seasonal offerings. Delete only when you&rsquo;re
        sure you won&rsquo;t bring it back.
      </p>
    </HelpArticle>
  )
}
