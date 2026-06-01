'use client'

import { UserCircle, BookmarkCheck, LogOut } from 'lucide-react'
import { useLushCustomerAuth } from './LushCustomerAuth'

/**
 * Customer-account widget for tenant booking sites.
 *
 * Lives in the FadeRoom header. Three states (driven by context, so
 * the widget and the booking form always agree about who's signed in):
 *
 *   - loading: render nothing (avoids "Sign in" flash before authed
 *     state lands)
 *   - unauthed: small "Sign in" button → opens LushAuthModal on this
 *     same page (no navigation, no booking-state loss)
 *   - authed: "Hi {firstName}" link to app.bkrdy.me/account, with a
 *     sign-out button next to it
 *
 * Why no own customerMe() call: the LushCustomerAuthProvider higher up
 * does that once per page load. Multiple consumers (this widget + the
 * booking form's auto-fill) read the same shared state — no duplicate
 * /auth/me requests, no flash, no stale views.
 */
export default function LushCustomerAccountWidget() {
  const { user, authChecked, open, signOut } = useLushCustomerAuth()

  if (! authChecked) return null

  if (! user) {
    return (
      <button
        type="button"
        className="lush-account-widget"
        onClick={() => open('signin')}
        aria-label="Sign in to your customer account"
      >
        <UserCircle size={14} />
        <span>Sign in</span>
      </button>
    )
  }

  const firstName = (user.name ?? '').split(' ').filter(Boolean)[0] ?? 'you'

  return (
    <div className="lush-account-widget lush-account-widget--authed">
      <a
        className="lush-account-widget-link"
        href="https://app.bkrdy.me/account"
        target="_blank"
        rel="noopener noreferrer"
        title="View your bookings"
      >
        <BookmarkCheck size={14} />
        <span>Hi {firstName}</span>
      </a>
      <button
        type="button"
        className="lush-account-widget-signout"
        onClick={signOut}
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut size={12} />
      </button>
    </div>
  )
}
