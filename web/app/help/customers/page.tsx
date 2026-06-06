import type { Metadata } from 'next'
import HelpArticle from '@/components/help/HelpArticle'

export const metadata: Metadata = {
  title: 'Customers | BookReady Help',
  description: 'Your customer list, visit history, VIP flags, notes, and tags on BookReady.',
}

export default function Page() {
  return (
    <HelpArticle
      slug="customers"
      intro="Every person who books builds your customer list automatically. The Customers area turns that list into something you can actually use to keep people coming back."
    >
      <h2>Your customer list</h2>
      <p>
        Open <strong>Customers</strong> to see everyone who&rsquo;s booked with
        you. Each entry is created the first time someone books, so you never have
        to add customers by hand. Search by name, email, or phone to find anyone
        fast.
      </p>

      <h2>Visit history</h2>
      <p>
        Click a customer to see their full history: past and upcoming appointments,
        what they booked, and what they spent. It&rsquo;s the context that makes a
        returning customer feel remembered. &ldquo;The usual?&rdquo; goes a long way.
      </p>

      <h2>Notes</h2>
      <p>
        Keep private notes on each customer: their preferences, the formula that
        worked, allergies, how they like their coffee. Notes are yours alone;
        customers never see them. This is the single highest-leverage habit for
        building loyalty.
      </p>

      <h2>VIP &amp; tags</h2>
      <p>
        Flag your best customers as <strong>VIP</strong>, and use <strong>tags</strong>{' '}
        to group people however you think: &ldquo;color customers,&rdquo;
        &ldquo;referrals,&rdquo; &ldquo;needs follow-up.&rdquo; Tags make it easy to
        spot patterns and, down the line, reach the right people.
      </p>

      <div className="help-note">
        <p><strong>Repeat customers are your business</strong></p>
        <p>Your dashboard tracks your repeat-booking rate. A returning customer is worth far more than a new one, and your notes and history are how you earn that second visit.</p>
      </div>

      <h2>Accounts vs contacts</h2>
      <p>
        Some customers create a BookReady account to manage their own bookings;
        others just book as a guest. Both show up in your list either way.
        An account simply lets the customer see their bookings across every
        BookReady business they visit. You don&rsquo;t need to do anything
        differently.
      </p>

      <h2>Privacy</h2>
      <p>
        Customer information belongs to your business and is never shared with other
        businesses. If a customer asks you to delete their data, you can remove
        their record. See our <a href="/privacy">Privacy Policy</a> for the details.
      </p>
    </HelpArticle>
  )
}
