import type { Metadata } from 'next'
import HelpArticle from '@/components/help/HelpArticle'

export const metadata: Metadata = {
  title: 'Getting started | BookReady Help',
  description: 'Your first 10 minutes on BookReady: the setup wizard, your dashboard, your booking link, and going live.',
}

export default function Page() {
  return (
    <HelpArticle
      slug="getting-started"
      intro="Welcome to BookReady. Here's how to go from a fresh account to a live booking page that takes appointments, usually under ten minutes."
    >
      <h2>The setup wizard</h2>
      <p>
        Right after you sign up, you land in the setup wizard. It walks you
        through five quick steps:
      </p>
      <ul>
        <li><strong>Business</strong>: your name, location, and how customers reach you.</li>
        <li><strong>Services</strong>: what you offer and what it costs. We pre-fill a few examples to rename.</li>
        <li><strong>Hours</strong>: the days and times customers can book.</li>
        <li><strong>Policies</strong>: your cancellation, no-show, and deposit rules.</li>
        <li><strong>Payments</strong>: connect Stripe to take deposits (optional, you can do it later).</li>
      </ul>
      <p>
        Everything here can be changed afterward, so don&rsquo;t overthink it.
        When you finish, you&rsquo;ll land on the &ldquo;You&rsquo;re live&rdquo;
        screen with your booking link ready to share.
      </p>

      <div className="help-note">
        <p><strong>Skipped the wizard?</strong></p>
        <p>No problem. Every step is also available from the main menu. The dashboard&rsquo;s setup checklist tracks what&rsquo;s left.</p>
      </div>

      <h2>Your booking link</h2>
      <p>
        Your public booking page lives at{' '}
        <code>yourbusiness.bkrdy.me</code>, the name you chose at signup. This
        is the link you put in your Instagram bio, text to customers, and share
        anywhere people book with you. You can copy it any time from the
        dashboard (the <strong>View site</strong> link at the top).
      </p>

      <h2>The dashboard</h2>
      <p>
        Your dashboard is home base. At a glance you&rsquo;ll see:
      </p>
      <ul>
        <li>Your next appointment and a countdown to it.</li>
        <li>Today&rsquo;s and tomorrow&rsquo;s schedule.</li>
        <li>A seven-day strip showing how booked-up your week is.</li>
        <li>Revenue and booking trend charts.</li>
        <li>New customers, top spenders, and your repeat-customer rate.</li>
        <li>A setup checklist so nothing falls through the cracks.</li>
      </ul>

      <h2>The main menu</h2>
      <p>
        On the left (or the menu button on mobile) you&rsquo;ll find every part
        of BookReady:
      </p>
      <ul>
        <li><strong>Dashboard</strong>: your overview.</li>
        <li><strong>Website</strong>: edit your public booking page.</li>
        <li><strong>Bookings</strong>: your calendar and appointment requests.</li>
        <li><strong>Customers</strong>: your customer list and history.</li>
        <li><strong>Payments</strong>: deposits, transactions, and payouts.</li>
        <li><strong>Integrations</strong>: connect other tools.</li>
        <li><strong>Settings</strong>: business info, booking rules, notifications, and your account.</li>
      </ul>

      <h2>Going live</h2>
      <p>
        Your site is live from day one during your free trial. To start taking
        real bookings, make sure you&rsquo;ve done these three things:
      </p>
      <ol>
        <li>Added at least one service with a price.</li>
        <li>Set your open hours.</li>
        <li>(Recommended) Connected Stripe so you can require a deposit and cut no-shows.</li>
      </ol>
      <p>
        Then share your <code>yourbusiness.bkrdy.me</code> link and you&rsquo;re
        in business.
      </p>
    </HelpArticle>
  )
}
