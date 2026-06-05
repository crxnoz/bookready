import type { Metadata } from 'next'
import HelpArticle from '@/components/help/HelpArticle'

export const metadata: Metadata = {
  title: 'Customers — BookReady Help',
  description: 'Your client list, visit history, VIP flags, notes, and tags on BookReady.',
}

export default function Page() {
  return (
    <HelpArticle
      slug="customers"
      intro="Every person who books builds your client list automatically. The Customers area turns that list into something you can actually use to keep people coming back."
    >
      <h2>Your client list</h2>
      <p>
        Open <strong>Customers</strong> to see everyone who&rsquo;s booked with
        you. Each entry is created the first time someone books — you never have
        to add clients by hand. Search by name, email, or phone to find anyone
        fast.
      </p>

      <h2>Visit history</h2>
      <p>
        Click a client to see their full history: past and upcoming appointments,
        what they booked, and what they spent. It&rsquo;s the context that makes a
        returning client feel remembered — &ldquo;the usual?&rdquo; goes a long way.
      </p>

      <h2>Notes</h2>
      <p>
        Keep private notes on each client — their preferences, the formula that
        worked, allergies, how they like their coffee. Notes are yours alone;
        clients never see them. This is the single highest-leverage habit for
        building loyalty.
      </p>

      <h2>VIP &amp; tags</h2>
      <p>
        Flag your best clients as <strong>VIP</strong>, and use <strong>tags</strong>{' '}
        to group people however you think — &ldquo;color clients,&rdquo;
        &ldquo;referrals,&rdquo; &ldquo;needs follow-up.&rdquo; Tags make it easy to
        spot patterns and, down the line, reach the right people.
      </p>

      <div className="help-note">
        <p><strong>Repeat clients are your business</strong></p>
        <p>Your dashboard tracks your repeat-booking rate. A returning client is worth far more than a new one — your notes and history are how you earn that second visit.</p>
      </div>

      <h2>Accounts vs contacts</h2>
      <p>
        Some clients create a BookReady account to manage their own bookings;
        others just book as a guest. Both show up in your list either way —
        an account simply lets the client see their bookings across every
        BookReady business they visit. You don&rsquo;t need to do anything
        differently.
      </p>

      <h2>Privacy</h2>
      <p>
        Client information belongs to your business and is never shared with other
        businesses. If a client asks you to delete their data, you can remove
        their record. See our <a href="/privacy">Privacy Policy</a> for the details.
      </p>
    </HelpArticle>
  )
}
