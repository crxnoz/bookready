# BookReady — Signup + Multi-tenant Smoke Tests

A short manual checklist for validating the two highest-stakes
end-to-end flows after any signup, auth, or template-picker change.
Should run in roughly 20 minutes total on prod or staging.

Use a fresh email per run (or run the [tenant cleanup tinker]
afterward so the next run starts clean). Each step has a clear
pass / fail criterion. If a step fails, stop and capture what you
saw — the failures matter more than racing to finish.

---

## Test 1 — Email signup, default template

**Goal.** A new owner who arrives at app.bkrdy.me with no marketing-
site context can sign up, verify, pick a plan, and land in the
editor without surprises.

- [ ] **Open `app.bkrdy.me/register`** in a fresh browser session
      (incognito works). The form shows owner name, email, password,
      confirm, business name, **Template picker** (collapsed,
      showing "The Fade Room" as default), ToS checkbox, CAPTCHA,
      Create account button.
- [ ] **Template picker shows "View 8 other templates" link**
      under the selected card. Click it.
- [ ] **All 9 other templates render in a list** (Velvet Theory,
      Blackline, Lush Studio, Opaline, Pétale, Bottega, Inkhouse,
      Clarity). Click one (e.g. Lush Studio).
- [ ] **Picker collapses, new selection card shows "Lush Studio"
      with the SELECTED badge.** The "View other templates" link
      reappears for further changes.
- [ ] **Fill the rest of the form**, accept ToS, solve CAPTCHA,
      Create account. Submit succeeds.
- [ ] **Lands on `/verify-email`.** Verification code arrives at
      the inbox. Enter it.
- [ ] **Lands on `/checkout/trial`.** Summary card shows Plan +
      Billing + SMS only — **no Template stat anymore.** Open
      "Change your plan" — no Template dropdown.
- [ ] **Start trial → Stripe Checkout → return to `/editor`.**
      Lands in the onboarding wizard.
- [ ] **Onboarding wizard renders the chosen template (Lush Studio)
      in the preview pane**, not The Fade Room.

---

## Test 2 — Email signup with marketing site template param

**Goal.** Marketing-site CTAs that forward `?template=…` continue to
pre-select the right template, and the picker still lets the owner
change their mind.

- [ ] **Open `app.bkrdy.me/register?template=opaline`** in a fresh
      session.
- [ ] **Template picker shows Opaline as the default** (selected
      card + SELECTED badge), not The Fade Room.
- [ ] **Change to Pétale via the View other templates expand.**
      Picker collapses on Pétale.
- [ ] **Complete signup as in Test 1**, verify, start trial.
- [ ] **Editor preview pane shows Pétale**, confirming the owner's
      explicit pick wins over the marketing-site default.

---

## Test 3 — Google signup, collapsible picker

**Goal.** Google OAuth signups get the same collapsible picker as
email signups, with no plan picker on the first screen.

- [ ] **Open `app.bkrdy.me/register`** in a fresh session, click
      "Continue with Google", complete the OAuth dance.
- [ ] **Lands on `/register/complete`** with the "One last step"
      heading. Business name field is empty (or pre-filled if
      coming from a marketing CTA).
- [ ] **Template picker is collapsed, showing the default selection
      + "View 8 other templates" expand.** It does NOT show all 9
      cards permanently expanded.
- [ ] **Expanding the picker reveals the other 8 templates** with
      the same color swatches + descriptions as the email flow.
- [ ] **Pick a template and submit.** Lands on `/checkout/trial`
      with the same template applied.
- [ ] **No plan picker was shown on `/register/complete`** — the
      Google flow goes straight from template pick to trial setup.

---

## Test 4 — `/checkout/trial` no-template polish

**Goal.** The "Change your plan" surface is plan-only — no template
confusion.

- [ ] **From any signup, reach `/checkout/trial`.** Summary card has
      exactly **3 stats**: Plan, Billing, SMS. (Previously had a 4th
      Template stat.)
- [ ] **Click "Change your plan" toggle.** Picker section opens with
      **3 fields**: Plan, Billing, Text pack. (Previously had a 4th
      Template dropdown.)
- [ ] **Footnote copy under the picker mentions changing template
      from Website Editor → Template after launch** (not from this
      surface).

---

## Test 5 — Multi-tenant invite, send + accept (new identity)

**Goal.** A brand-new stylist email goes through the email-link
accept flow and ends up as staff at a single tenant.

**Setup.** You'll need two browser sessions: one signed in as the
owner of Studio A, another to act as the stylist.

- [ ] **As Studio A owner**, go to `/editor/staff` and create a new
      staff member with a fresh stylist email (e.g.
      `stylist+a@your-test-domain.com`).
- [ ] **Click "Send login invite"** on the staff row. Toast confirms
      the invite was sent.
- [ ] **The stylist email receives an invite email** within a minute.
- [ ] **In the stylist's session**, click the email link. Lands on
      `/staff/accept-invite?token=…`.
- [ ] **Password strength meter renders** as you type a password.
- [ ] **Submit a strong password.** The stylist is signed in as
      staff at Studio A and lands at
      `/editor/appointments?scope=mine`.
- [ ] **Sidebar dropdown shows "Working at: Studio A · Studio ·
      Staff · 1 business"** with no invite badge.

---

## Test 6 — Multi-tenant invite, second studio + inbox accept

**Goal.** The same stylist is invited to a second Studio, sees the
invite in the sidebar inbox, and accepts without re-entering her
password.

**Setup.** Studio A from Test 5 already has the stylist as staff,
and her browser is signed in to Studio A.

- [ ] **As Studio B owner** (separate tenant), go to `/editor/staff`,
      create a new staff member with the SAME stylist email.
- [ ] **Click "Send login invite".** Backend accepts (cross-tenant
      now allowed under cap).
- [ ] **In the stylist's session at Studio A**, refresh the editor.
      The sidebar tenant-switcher button shows a **blush badge with
      `1`** and subtitle "… · 1 new invite".
- [ ] **Click the switcher.** Dropdown opens with a "Pending invites"
      section at top listing Studio B + "Invited you as staff" +
      Accept invite button.
- [ ] **Click Accept invite.** Spinner appears briefly, invite row
      disappears, Studio B appears under "Switch business" below.
      Badge clears.
- [ ] **Click Studio B in the Switch business list.** Page reloads
      and the sidebar now reads "Working at: Studio B".

---

## Test 7 — Multi-tenant cap enforcement

**Goal.** A third Studio invite for the same stylist gets refused
with the "email us" overflow message.

**Setup.** Stylist now has Studio A + Studio B linked from Test 6.
Need a Studio C tenant (any third Studio account).

- [ ] **As Studio C owner**, create a staff row with the stylist's
      email and click "Send login invite".
- [ ] **Backend refuses with 422** + message similar to "They are
      already linked to the maximum of 2 Studio businesses. Email
      hello@mybookready.com to request an exception."
- [ ] **The stylist's existing Studio A + Studio B links stay
      intact** — no side effects from the rejected invite.

---

## Test 8 — Multi-tenant via email-link with existing identity

**Goal.** An invitee who already has a BookReady account but isn't
signed in clicks the email link and finishes via the sign-in route.

**Setup.** Need a stylist who already has a BookReady identity (any
of the prior tests' stylists works) but is NOT currently signed in.

- [ ] **In a fresh incognito session**, click the email-link invite
      from a Studio that doesn't already have this stylist linked.
      Lands on `/staff/accept-invite?token=…`.
- [ ] **Enter a fresh password and submit.** Backend refuses with
      a "This email already has a BookReady account" error message
      + an inline **"Sign in to accept this invite" link**.
- [ ] **Click the sign-in link.** Lands on `/login` with a
      `?next=/staff/accept-invite?token=…` query.
- [ ] **Sign in with the stylist's existing credential.** After
      success, lands back on `/staff/accept-invite` with the same
      token.
- [ ] **Enter the existing password.** Accept succeeds, stylist is
      now linked to this Studio too.

---

## Test 9 — Owner-self card on /editor/staff

**Goal.** The owner's own row in /editor/staff doesn't show a
"Send login invite" button (already covered by central User
credential).

- [ ] **As owner of any Studio**, go to `/editor/staff`. Your own
      row (matching your owner email) shows the cream
      **"This is your owner login."** note instead of the invite
      button.
- [ ] **Other staff rows still show "Send login invite"** when they
      have a real email and aren't already linked.

---

## After running

If any test fails, capture:

- Which step, with exact wording you saw on screen
- Screenshot of the broken surface
- Last 30 lines of `/var/www/bookready-api/api/storage/logs/laravel.log`
  if the failure looked server-side

Then clean up created tenants via the tenant-cleanup tinker so the
next run starts fresh. Reference: the snippet that destroyed
carre/carrera/carlitos/daysgraphic/winnyksk in this session lives
at `bookready-zeely-ad-copy.md` ... no, that's the ad doc. See the
tinker call you ran on 2026-06-12; same shape applies for any
test-tenant cleanup.

---

## Notes on stability

- These tests assume the prod Twilio account is wired (Test 5+
  staff invite emails are sent via PlatformMailer, which is
  separate from Twilio — should always work).
- Cross-tenant accepts require the migration
  `2026_06_12_000002_relax_users_email_unique_for_multi_tenant`
  to have run. Confirm via `SHOW INDEX FROM users` — there should
  be a `users_tenant_id_email_unique` and NO `users_email_unique`.
- The invite inbox surfaces invites within 60 seconds of the
  /auth/me poll, which happens on every editor page load. Refresh
  the page to force a poll.
