# BookReady v2 — Roadmap

Last updated: 2026-06-11

## What v2 is (and isn't)

v1 shipped a working multi-tenant booking SaaS with three plans, nine
templates, Stripe Connect for customer payments, Stripe Cashier for
subscriptions, customer accounts, owner dashboards, staff invites, and
an admin surface. The core product loop works end-to-end: signup →
template pick → trial → live booking site → first customer
appointment → first payout.

v2 is **everything between "the product technically works" and "the
product is the obvious choice for an Instagram-first beauty studio."**
It is not a rewrite. It is not a new architecture. It is the layer of
polish, scale, integrations, and growth features that turn early-
access testers into vocal advocates and bring the next ten thousand
tenants in through word of mouth.

Three rules for v2 scoping:

1. **Real-world workflows the founder watched a tenant struggle with
   in the first 30 days of v1 always win.** Multi-tenant staff
   (chair renters) is the first example; we discovered it the day
   v1 launched.
2. **Anything that touches the booking transaction is high-stakes.**
   New booking features must be backwards-compatible with existing
   appointments, deposits, refunds, and reminder flows.
3. **No new vertical-specific code paths.** v2 stays horizontal across
   the nine templates. Vertical-specific features (medspa intake
   forms, tattoo deposit ladders, etc.) wait for v3 specialization.

---

## Theme 1: Multi-tenant staff identity (chair renters)

**Why this matters most:**
A real-world stylist works at Salon A Monday-Tuesday and Salon B
Wednesday-Saturday. v1 refuses the second salon's invite because the
central User row is bound to one tenant. This blocks the chair-renter
workflow, which is the dominant employment model for nail, lash, and
brow studios in major U.S. cities. We learned this within hours of v1
going live.

**Scope:**

- Allow multiple `users` rows to share one `identity_id` (one User row
  per tenant the person works at)
- StaffInviteController::accept creates a new User row at this tenant
  pointing at the existing identity. No new password is set — staff
  signs in with their existing cross-tenant credential
- StaffController::sendInvite refusal logic loosens: only refuse if a
  User already exists at THIS tenant for this email, OR the identity
  is already at the per-tier cap (see below)
- Login flow: when an identity has Users at more than one tenant,
  present a tenant picker after password validation
- Editor sidebar: a **dropdown** showing every business the stylist
  is linked to, with the tenant name and plan-tier badge per row.
  Default-selected entry is the currently-active tenant; clicking
  a different row re-issues the Sanctum cookie scoped to that User
  row and reloads the editor in that tenant's context. Below the
  list, a quiet "Need access to another business? Email
  hello@mybookready.com" link makes the overflow path visible
- Backend: new GET /auth/me returns the list of tenants the identity
  has Users at (with each tenant's name + plan), so the dropdown can
  render the list

**Per-tier caps (founder decision 2026-06-12):**

One identity can be linked to AT MOST:

- **1 Solo tenant.** Solo means "single-operator" by definition; one
  identity owning multiple Solos is incoherent. Refuse owner signup
  if the identity already owns a Solo.
- **2 Studio tenants.** Covers the common chair-renter case (works
  Mon-Tue at Studio A, Wed-Sat at Studio B). Anything beyond two is
  rare enough to handle by hand.

Caps are enforced in two places:

- **Owner signup** (RegisterController): if the identity already
  hits the cap for the tier they're trying to create, refuse with a
  422 + clear "you already have N {tier}s linked to this email; if
  you need another, email hello@mybookready.com" message.
- **Staff invite** (StaffController::sendInvite): if the identity
  already hits the cap for THIS tenant's tier, refuse with a similar
  message routed through the inviting owner's UI.

The overflow path is intentional: stylists who genuinely need a
third Studio email hello@ for manual provisioning. Forces a human
touchpoint for the long-tail volume use case so we never have to
build "stylist works at 8 studios" abuse handling.

Owner of a Studio + staff at another Studio = 2 Studios, at cap.
Owner of a Solo + staff at 2 Studios = 1 Solo + 2 Studios, at cap on
both tiers. Stylist trying to be staff at a 3rd Studio while at cap =
refused.

When Salon ships in v3 (demand-gated), Salon gets its own cap
(likely 1 since Salon is enterprise-scale) decided alongside the v3
Salon build.

**Out of scope for v2:**

- Per-tenant role differentiation beyond "owner" vs "staff" (e.g. a
  user being owner at A and staff at B would work, but no fine-grained
  permission system)
- Cross-tenant data sharing (a stylist's customer notes at Salon A do
  not flow to Salon B)
- Cross-tenant calendar visibility (the stylist sees only one tenant
  at a time)
- Multi-location identity (a Salon-tier feature where one tenant has
  several locations and staff move between them). Salon scope as a
  whole is deferred to v3 demand-gated — this work focuses on the
  Studio chair-renter case where two SEPARATE Studio tenants share
  a stylist.

**Effort:** 1.5 engineering days

**Dependencies:** None. Identities table is already in place.

**Acceptance criteria:**

- Owner of Salon A invites stylist@gmail.com → stylist accepts → stylist
  appears in Salon A's staff list
- Owner of Salon B invites the same stylist@gmail.com → invite accepted
  → stylist appears in Salon B's staff list
- Stylist logs in once at app.bkrdy.me/login → sees tenant picker →
  chooses Salon A → lands in Salon A's editor with limited permissions
- Stylist clicks "switch" in sidebar → tenant picker → chooses Salon B →
  editor reloads scoped to Salon B
- Stylist's password reset works once and propagates to both tenants
  (it lives on the shared identity row)

**Stretch (v2.5 if v2 ships clean):** allow stylist to view her
combined schedule across both tenants in a read-only "all my work"
view.

---

## Theme 2: Custom domain UI

> **POSTPONED TO v3** (2026-06-12). The Studio plan ships with the
> `allows_custom_domain` flag in PlanFeatures but no connector UI.
> Bookready.me subdomains are good enough for v2; custom domains
> become a v3 differentiator that pairs naturally with the marketing
> push around white-label and template marketplace.

**Why:**
PlanFeatures already exposes `allows_custom_domain: true` for Studio
and Salon, but there is no UI to actually connect a custom domain. A
premium salon paying $49 a month wants `book.salonname.com` to map to
their BookReady site, not `salonname.bkrdy.me`. Without this, the
Studio price feels like a Solo price with extra staff seats.

**Scope:**

- `/editor/settings → domains` tab with three states:
  - **No custom domain:** picker shows the tenant's bkrdy.me subdomain
    plus a "Connect your own domain" CTA
  - **Domain pending DNS:** shows the customer's domain plus a "Add a
    CNAME record" instruction with the exact CNAME target, copy
    button, and a "Check DNS now" button
  - **Domain active:** shows the live custom domain with a "Remove" CTA
- Backend: new tenants.custom_domain column, GET/POST/DELETE
  /editor/domain endpoints
- Background job that polls DNS every 5 minutes for pending domains
  and flips them active once the CNAME resolves correctly
- Caddy or Nginx config update on the prod server to add the custom
  domain to the SSL cert (Let's Encrypt auto-renew)
- Email to owner when domain goes active

**Out of scope:**

- Apex domain support (only `book.salonname.com` style subdomain).
  Apex domains require ALIAS/ANAME records which only some DNS
  providers support and add edge cases
- DNS provider OAuth integrations (one-click setup via Cloudflare or
  Namecheap)

**Effort:** 3 engineering days (most of the time is the Caddy/Nginx
config + Let's Encrypt automation)

**Dependencies:** Decide whether to run domains through Cloudflare
(easier SSL, harder to reason about) or direct on the prod server
(more setup work, full control). See open question #1.

**Acceptance criteria:**

- Studio owner enters `book.salonname.com` → backend stores pending
  state → UI shows CNAME instructions
- Owner adds CNAME at their DNS provider → DNS poller flips domain to
  active within 10 minutes → owner gets email
- Visitor lands on `book.salonname.com` → sees the tenant's
  BookReady site over HTTPS → cookies work end-to-end (no
  CORS/cookie regression)
- Owner removes the domain → custom domain stops resolving → bkrdy.me
  subdomain still works

---

## Theme 3: Salon plan rollout

> **POSTPONED TO v3 (demand-gated)** — 2026-06-12. Founder call:
> hold Salon work until real demand surfaces. Building self-serve
> CSV migration or sales-led white-glove for Salon is significant
> scope (5-10 days plus the multi-location data model), and Studio
> already covers two to five staff which is the most common
> studio-owner size. v2 focuses on making the Studio path
> indisputable. Salon comes back online in v3 when triggered by:
>   - 10+ inbound Salon-segment inquiries, OR
>   - 5+ Studio tenants asking for multi-location, OR
>   - Studio tenants hitting the 5-seat cap and upgrading would have
>     been the obvious next step
> See [v3 roadmap](./v3-roadmap.md) for the v3 carry of this theme.

**Why:**
Salon is waitlist-only in v1. The intentional reason was that the
template needs a custom-tuned migration from Mindbody / Boulevard /
Phorest, which is a sales motion not a self-serve motion. v2 needs to
either (a) build the self-serve migration UX so Salon is on the same
checkout rail as Studio, or (b) build a proper "Talk to sales"
inquiry form + manual onboarding workflow.

**Scope:**

- Decide: self-serve Salon vs sales-led Salon (see open question #2)
- If self-serve: build CSV import flows for the four data types
  (appointments, customers, services, staff). Each import has a
  preview step and a "this is what will be created" diff before commit
- If sales-led: build /editor/contact-sales modal, a CRM webhook
  destination (HubSpot or just an email to hello@), and a manual
  provisioning playbook
- Either path: build the multi-location data model (one tenant can
  have N locations, each location has its own staff + hours + Stripe
  account). This is the architectural change Salon really needs

**Out of scope:**

- Salon-scoped reporting across multiple locations (shows up in v2.5)
- Enterprise-level RBAC (manager vs owner permissions)

**Effort:** 5-10 engineering days depending on path

**Dependencies:** Decision on self-serve vs sales-led (#2)

**Acceptance criteria:**

- A salon with 8 stylists and 2 locations can onboard end-to-end
  without founder intervention
- Migration from Mindbody preserves customer history and upcoming
  appointments (no data loss)
- Reports at /editor distinguish revenue per location

---

## Theme 4: Templates

> **POSTPONED TO v3** (2026-06-12). v1 ships nine templates. That's
> enough surface area to find product-market fit across the major
> beauty verticals. Adding more templates without first proving v1's
> conversion data tells us what to build is premature. v3 reopens
> templates with data in hand and the marketplace foundations.

**Why:**
Nine templates is a lot but they cluster in three brand families
(barber, soft beauty, clinical). Every prospective tenant that doesn't
find a template matching their brand bounces. Two new templates
already exist as scaffolding (#168, #169). Beyond that, v2 should
open the template platform.

**Scope:**

- Finish the two scaffolded templates (#168, #169). Skin TBD.
- Build a template preview surface on mybookready.com/templates where
  a visitor can interact with a live demo (data is hardcoded fake
  tenant data — no auth required)
- "Try this template" CTA on the preview surface that deep-links into
  signup with the template preselected
- Add 2-3 industry-specific templates based on tester demand patterns:
  candidate verticals are tattoo (Inkhouse exists but skin needs
  refresh), permanent makeup specialists (Opaline serves but more
  clinical-leaning competitors exist), and hair extensions
  specialists (Velvet Theory serves but the extensions niche is
  underserved)
- Improve the editor template-switcher UX: today switching templates
  is a one-way decision baked into onboarding. v2 lets owners try a
  different template without losing their content (services, hours,
  policies, gallery are template-agnostic; section ordering and
  template-specific copy is what changes)

**Out of scope:**

- Template marketplace (third-party designers selling templates)
  pushes to v3
- Custom CSS / code blocks for owners. The "design system promise" of
  BookReady is that owners don't need a developer. Letting them edit
  CSS would break that promise.

**Effort:** 4-6 days total (2 days for the two scaffolded templates,
2 days for new verticals, 2 days for the preview + switcher UX)

**Dependencies:** Marketing strategy needs to identify which two
verticals to target next (#3)

**Acceptance criteria:**

- All 11+ templates have a live preview on mybookready.com/templates
- An anonymous visitor can interact with the booking flow end to end
  in a preview without signing up
- Owners can switch templates in /editor/website without losing their
  content

---

## Theme 5: Recurring appointments

> **POSTPONED TO v3** (2026-06-12). Founder call: the all-prepaid
> model is too heavy a customer ask, and per-visit charging adds
> Stripe Connect complexity that's not worth the build cycle yet.
> When recurring appointments returns in v3 it ships as a
> **per-tenant toggle** so each owner picks whether their service
> menu offers recurring options at all, with their preferred charging
> model (deposit + per-visit, all-prepaid, or owner choice).

**Why:**
Color, lash fills, gel mani-pedis, and PMU touch-ups follow a
predictable cadence (every 4 weeks, every 6 weeks, every 3 months).
v1 requires the customer to re-book each time. v2's recurring
appointment feature does two things:

1. Reduces no-shows (the customer is committed N appointments out)
2. Massively reduces back-office work (the stylist doesn't have to
   chase rebookings)

**Scope:**

- Customer-facing: "Book every 4 weeks for 6 visits" option on the
  booking form (gated to specific service types via the owner's
  service config — owner decides which services are recurring-eligible)
- Backend: new recurring_appointment_groups table. Each booking
  creates one group + N individual appointments
- Deposit handling: the deposit is collected once for the first
  appointment + the remaining N-1 are charged at the per-visit rate
  on each appointment's due date (uses Stripe Connect with the
  customer's saved card)
- Cancellation: cancelling a single recurring appointment refunds that
  one; cancelling the group cancels all future appointments and
  refunds any pre-paid deposits
- Owner UI: recurring appointment group shows as a single block on
  the calendar with a "view all N visits" affordance

**Out of scope:**

- "Smart" rescheduling when the recurring slot conflicts with a
  business closure. v2 sends an email asking the customer to manually
  reschedule. v3 auto-suggests alternates.
- Variable cadence (e.g. "every 4 weeks for the first 3 visits, then
  every 6 weeks"). Pushes to v3.

**Effort:** 4 engineering days

**Dependencies:** Stripe Connect "card on file" charging flow needs
to be verified working in production (it should be — confirmation
flow today already saves the card).

**Acceptance criteria:**

- Customer books "Color · every 4 weeks · 6 visits" → 6 appointments
  appear on the owner's calendar at 4-week intervals
- Deposit charged once at booking. Per-visit charges occur on
  appointment day or owner sets policy
- Customer's manage-booking page shows all 6 appointments with
  individual cancel + group cancel options
- Owner's confirmation email mentions "first of 6 recurring visits"

---

## Theme 6: Membership / package sales

> **POSTPONED TO v3** (2026-06-12). Recurring appointments (Theme 5)
> already covers the highest-frequency rebooking case. Memberships
> and packages add real complexity (redemption tracking, expiration,
> gift handling) that earns its own focused build cycle in v3 rather
> than landing as a bolt-on in v2.

**Why:**
Beauty studios sell packages (10-pack of facials, monthly unlimited
brow tints, $200/month membership for two services). v1 has no
concept of this. Owners route around it by charging upfront and
manually tracking redemptions in a spreadsheet. We can capture this
behavior in software.

**Scope:**

- Owner UI under /editor/services → "Packages" tab. Owner creates a
  package: name, price, included visits or services, expiration
  policy, recurring vs one-time
- Customer-facing: package purchase flow on the public site
  (separate from the booking flow; doesn't reserve a slot)
- Customer account: shows owned packages, remaining redemptions,
  expiration
- Booking flow: when a customer who owns a package books an eligible
  service, the booking auto-applies the package balance and skips the
  payment step
- Membership = recurring package with auto-renewal. Stripe Connect
  handles the recurring charge. Cancellation policies similar to
  subscription billing
- Owner reporting: package revenue, redemption rate, expiration
  forecast

**Out of scope:**

- Gift packages (buyer ≠ recipient). v3 likely.
- Family/shared packages where one purchase covers multiple
  customers. v3 likely.

**Effort:** 5 engineering days

**Dependencies:** Stripe Connect recurring billing on the appointment
rail (today recurring billing lives on Cashier rail for SaaS
subscriptions; appointment-side recurring is new wiring)

**Acceptance criteria:**

- Owner creates "5 Brow Lifts · $300" package → appears on customer-
  facing site
- Customer buys → package balance shows in their account → next
  booking redeems one and skips payment
- Owner sees package revenue separately from per-appointment revenue

---

## Theme 7: Booking confirmation polish

**Why:**
The confirmation email and post-booking page are the highest-leverage
brand moments in the entire product. A customer who books and gets a
mediocre confirmation feels less excited; a customer who gets a
beautifully branded confirmation tells their friends. v1 ships the
basics. v2 makes them shine.

**Scope:**

- Per-template confirmation email designs. Today every template uses
  the same default email shell. v2 lets each template define a
  confirmation email design that matches the brand
- Per-template post-booking "thank you" page on the public site,
  branded to match the template
- "Add to calendar" with proper iCal that includes service notes,
  pre-appointment instructions, address (with map link), and a
  cancellation link
- Pre-appointment SMS reminder customization: the owner can write a
  per-service reminder ("Bring reference photos for your color
  appointment") that ships with the reminder
- Post-appointment follow-up: 24h after appointment, automated
  follow-up email asking for a review + suggesting a rebooking. Owner
  controls timing and copy

**Out of scope:**

- Branded customer review collection (we surface Google review prompts
  but don't store reviews in our DB)
- Magic-link rebooking ("re-book the same service in 4 weeks") —
  delivered through Theme 5 (Recurring Appointments)

**Effort:** 3 engineering days

**Dependencies:** Twilio TFV approval (#171) for the SMS components

**Acceptance criteria:**

- Each template defines its own confirmation email design
- The "add to calendar" file opens correctly in iOS Calendar, Google
  Calendar, and Outlook
- Owner can customize the follow-up email per service
- Owner can see follow-up email open rate + click-through rate in the
  dashboard

---

## Theme 8: Smarter dashboards

**Why:**
The v1 dashboard tells the owner what happened. The v2 dashboard
should help the owner decide what to do next. "You have 3 open slots
this weekend; here are 5 customers who haven't booked in 6+ weeks"
is more valuable than "weekly revenue: $1,200."

**Scope:**

- Customer cohort retention (which week's signups are still booking
  3 months later?)
- "Last booked" highlight on the customer list: customers who haven't
  booked in 60+ days get a soft prompt to "reach out"
- One-click bulk email to customers in a segment (e.g. "all customers
  who haven't booked in 60 days, schedule a free consultation")
- Hour-of-day heatmap showing when appointments cluster
- Service revenue breakdown: which service line is growing? Which is
  shrinking?
- "Your busiest day next month is Saturday June 28" predictive nudge
  on the dashboard

**Out of scope:**

- Customer lifetime value (LTV) calculations with statistical
  significance. Too noisy with small tenant data sets.
- Predictive churn modeling. Pushes to v3.

**Effort:** 3 engineering days

**Dependencies:** None.

**Acceptance criteria:**

- Owner can identify their top 10 lapsed customers in one click
- Owner can send a re-engagement email to a customer segment in two
  clicks
- Dashboard surfaces at least one actionable insight per visit (not
  just metrics)

---

## Theme 9: Scale & reliability

**Why:**
v1 runs on one droplet with one MySQL instance. We can probably scale
to 200 tenants on this setup before pain. After that we need the
infrastructure changes already tracked in the launch tasks
(#134-150). v2 should ship the scale work before we hit 200 tenants,
not after.

**Scope (in order of ROI):**

1. **Move email + SMS to queue** (task #141, #142). Today they block
   the response. Queue them and the booking confirmation responds
   in ~50ms instead of ~800ms.
2. **Image optimization on upload** (task #146). Today the owner can
   upload a 10MB iPhone photo. We resize on the fly which is wasteful.
   v2 generates the right derivative sizes once and stores them.
3. **R2 / S3 for tenant uploads** (task #136). Currently tenant
   uploads sit on the droplet filesystem. R2 gives us CDN edge
   delivery, cheaper storage, and durable backups.
4. **Redis cache for tenant resolution + public site** (tasks
   #139, #140). Subdomain → tenant_id lookup happens on every public
   request. Cache it. Public site response is also cacheable for
   1-5 minutes.
5. **Managed MySQL** (task #134). Migrate from droplet-local MySQL to
   DigitalOcean Managed DB. Backups, replication, point-in-time
   restore. Adds $30/month at the bottom tier.
6. **Cloudflare in front of everything** (task #143). DDoS protection,
   edge SSL termination, asset caching.

**Out of scope for v2:**

- Multi-region (CDN edge is fine; database replication across regions
  pushes to v3)
- Kubernetes / container orchestration. The two-droplet setup with
  PM2 is appropriate at our scale.

**Effort:** 8 engineering days for items 1-4. Items 5-6 are 1 day
each of careful migration work.

**Dependencies:** Need at least one day of downtime-tolerant work for
the MySQL migration. Schedule for Sunday early morning.

**Acceptance criteria:**

- Booking confirmation responds in <100ms p95 (currently ~800ms p95)
- Image uploads always serve at the right size (no on-the-fly resize)
- Tenant subdomain resolution is sub-millisecond (cached)
- One-week disaster recovery: prove we can restore the DB from a
  managed backup and bring the app back up in under 2 hours

---

## Theme 10: Marketing site & SEO

**Why:**
mybookready.com is the funnel. Right now it has the pages it needs
(pricing, templates, about, contact) but is not SEO-tuned and has
no growth content. v2 fixes that.

**Scope (already tracked under #192):**

- Pull the existing SEO audit findings into a sprint
- Add a /blog with the first 12 posts seeded by the founder + AI
  collaboration. Topics: "how to start a lash business," "how to
  raise your prices," "Square vs BookReady," "how to take better
  portfolio photos." Each post target one keyword
- Add /compare/{competitor} pages (Square, GlossGenius, Vagaro,
  Booksy, Mindbody) with side-by-side feature tables
- Add /templates/{slug} landing pages with copy specific to the
  template's target vertical
- Schema markup on every page (already done on tenant sites; add to
  marketing site)
- Open Graph + Twitter card tags
- Migrate any remaining marketing-site content from prod's "pages"
  configuration into source-controlled MDX (the existing pages may
  be hardcoded in Next.js components today)

**Out of scope:**

- Paid acquisition strategy (separate marketing track, not engineering)
- Influencer partnerships (relationship work, not product work)

**Effort:** 5 engineering days for the structural changes; ongoing
content production is separate

**Dependencies:** SEO strategy decisions and competitor research are
input, not output, of this work

**Acceptance criteria:**

- All 11+ template pages live with vertical-specific copy
- 12 blog posts published, each indexed by Google
- 5 competitor comparison pages live
- Organic traffic to mybookready.com 5x in 90 days

---

## Theme 11: Integrations

**Why:**
Every integration is a sales objection killer. "Does BookReady
integrate with X?" gets answered with yes more often = more
conversions.

**Scope (in order of customer demand pattern):**

1. **Google Calendar two-way sync.** v1 has the read side. v2 adds
   the write side so blocking time on Google Calendar reflects in
   BookReady. This is the most-requested integration in beauty SaaS.
2. **Apple Calendar / iCal subscribe.** A subscription URL that
   feeds the owner's BookReady appointments into Apple Calendar with
   live updates. No write-back; read-only.
3. **Square import.** One-click migration from Square Appointments.
   Pulls customers, upcoming appointments, services, hours. This is
   a conversion lever, not an integration in the ongoing-relationship
   sense.
4. **Zapier.** Triggers (new booking, booking cancelled, customer
   created) and actions (create booking, update customer). Gives
   tenants an automation surface without us building per-integration
   features.
5. **Instagram DM auto-response.** "Book here" link injection into
   Instagram's Meta Business API. Lower priority because Meta's
   business API is hostile to small operators.

**Out of scope:**

- Mailchimp / Klaviyo integrations. The /editor/customers bulk email
  feature in Theme 8 covers the same need for most operators.
- QuickBooks. Push to v3.

**Effort:** 2 days per integration on average. The Google Calendar
two-way sync is the most complex (3 days).

**Dependencies:** Google Cloud verification (#228) needs to be in
production tier for the Google Calendar work.

**Acceptance criteria:**

- Owner can connect Google Calendar in one click and bookings flow
  bi-directionally
- Owner can paste a Square Appointments URL and have their data
  imported in under 10 minutes
- At least 5 Zapier triggers + 5 actions are live

---

## Theme 12: PWA + mobile experience

**Why:**
The owner is on a phone. Always. v1's responsive design works but
isn't optimized. v2 makes BookReady feel like a native app on
mobile.

**Scope:**

- Progressive Web App: install prompt, offline page, app icon, splash
  screen. The editor and the customer account both get PWA treatment.
- Push notifications (web push) for new bookings, cancellations,
  payment failures. Requires owner opt-in. Replaces some of the email
  noise.
- Mobile-first rebuild of three highest-traffic editor pages:
  /editor (dashboard), /editor/appointments, /editor/customers.
  Currently they're desktop-first with mobile adaptations; flip the
  default
- Owner camera integration: "take a photo" button on the gallery
  editor uploads directly without a file picker. Same for portfolio
  galleries.

**Out of scope:**

- React Native or native iOS/Android apps. v3 likely. The PWA is the
  bridge that proves out demand for native.

**Effort:** 6 engineering days

**Dependencies:** Stable HTTPS on prod (we have it). Service worker
testing across browsers (a few days of QA).

**Acceptance criteria:**

- Owner can install BookReady to their home screen on iOS and Android
- Web push notifications work on iOS Safari (limited; ok) and Android
  Chrome (full)
- New booking lands as a push notification within 10 seconds

---

## Theme 13: Payments polish

> **POSTPONED TO v3** (2026-06-12). Stripe Connect through v1 is
> reliable for the booking transaction itself. Tax automation, refund
> in-app, retry strategy, and tip presets are all real wins but none
> are dealbreakers for the launch cohort. v3 takes the payments
> surface end-to-end after the rest of the product polish lands.

**Why:**
v1's Stripe Connect integration covers the basics but leaves money on
the table.

**Scope:**

- **Stripe Tax integration.** Auto-calculate sales tax on bookings in
  supported regions. Critical for the medspa vertical (most U.S.
  states tax medspa services); nice-to-have for hair/nails (varies by
  state).
- **Tip flow enhancements.** Today tipping happens at booking time
  (pre-tip) and post-appointment (the tip link in confirmation
  emails). v2 adds: tip suggestions tuned to the service price
  ($45 service → suggest $9/$13/$18 not 15/20/25%), one-tap re-tip
  for repeat customers, owner-customizable default tip presets
- **Refund automation.** Today refunds happen through Stripe dashboard
  manually. v2 adds an in-app refund button on the appointment detail
  page with a confirmation, reason field, and automatic email to
  customer
- **Failed payment retry strategy.** Today failed deposits halt the
  booking. v2 lets the owner configure: hold the slot for 24h while
  retrying the card, or release immediately. With email to customer
  asking for a new card

**Out of scope:**

- Multi-currency (push to v3; requires major data model work)
- ACH / bank transfer (Stripe Connect doesn't support yet at our tier)
- Buy-now-pay-later (Affirm/Klarna). The booking ticket sizes don't
  justify the complexity yet.

**Effort:** 4 engineering days

**Dependencies:** Stripe Tax enrollment (founder-side, not
engineering)

**Acceptance criteria:**

- Bookings in Texas show TX sales tax. Bookings in Oregon don't.
- Owner can issue a refund from inside BookReady without opening
  Stripe
- Failed deposit retries automatically for 24h before the slot is
  released

---

## Theme 14: Referral program

> **POSTPONED TO v3** (2026-06-12). Referrals are the highest-
> leverage growth mechanism long-term, but we need a stable v2
> product surface first so referees don't bounce on rough edges that
> are already on the v2 fix list. v3 ships referrals once the
> retention curve is established.

**Why:**
Beauty operators talk to each other. A lot. The single highest-
leverage growth mechanism for v2 is making it easy for an existing
tenant to refer the next one and earn something for it.

**Scope:**

- Every tenant gets a referral link (`mybookready.com/r/{slug}`)
- When someone signs up via a referral link, the referring tenant
  gets one month free (their next Stripe invoice reduced by 100%)
- When the referee converts from trial to paid, the referring tenant
  gets another month free
- Optional: stackable rewards (refer 3 tenants in 6 months → 6 months
  free)
- Owner UI: /editor/referrals shows referrals sent, referees who
  signed up, referees who converted, rewards earned
- Marketing: small "Refer a friend" banner on the dashboard for
  active subscribers (Solo + Studio + Salon)

**Out of scope:**

- Cash payouts (only credit toward subscription)
- Tiered influencer program with affiliate IDs (push to v3)

**Effort:** 3 engineering days

**Dependencies:** Stripe Cashier customer-credit support. (It does;
just need to wire it.)

**Acceptance criteria:**

- Referral link works end to end (referee signs up, referrer gets
  credit on next invoice)
- /editor/referrals shows status accurately
- Email to referrer when their referee converts

---

## Sequencing

**v2 starts immediately (2026-06-12).** Founder decision: build v2 in
parallel with v1 testing rather than waiting for a clean launch
event. Current testing tenants act as the canary cohort so we can
observe how update flows feel from the tenant's perspective (a real
v2 deliverable in itself — proving the continuous-update cadence
works before we have hundreds of paying tenants depending on it).

Themes 2, 4, 5, 6, 13, and 14 moved to v3 (2026-06-12). The phases
below reflect the trimmed v2 scope.

### Phase 1: Plug the leaks (weeks 1-3)

These are the things early-access testers will hit IMMEDIATELY and
the things that turn into negative reviews if we don't fix them.

1. **Multi-tenant staff identity** (Theme 1)
2. **Wrap RegisterController in transaction** (#229, prevents orphans)
3. **Split Google OAuth** (#228, unblocks unlimited signups)
4. **Twilio TFV submission** (#171, unblocks reliable SMS)

Total: ~3 engineering days. Outcome: tenants stop hitting walls.

### Phase 2: Polish + scale (weeks 4-7)

These move BookReady from "works" to "feels right."

5. **Booking confirmation polish** (Theme 7)
6. **Smarter dashboards** (Theme 8)
7. **Scale & reliability items 1-4** (Theme 9)

Total: ~10 engineering days.

### Phase 3: Growth foundations (weeks 8-11)

8. **Marketing site & SEO** (Theme 10)
9. **Google Calendar two-way sync + Square import** (Theme 11 items 1+3)

Total: ~8 engineering days.

### Phase 4: Platform plays (weeks 12-15)

10. **PWA + mobile experience** (Theme 12)

Total: ~6 engineering days. Salon plan deferred to v3 pending
demand signal.

### Phase 5: Tail-end scale (weeks 18+)

12. **Zapier + remaining integrations** (Theme 11 items 2, 4, 5)
13. **Theme 9 items 5-6 (MySQL managed, Cloudflare)**

Total: ~6 engineering days. Outcome: v2 closeout and v3 ramp-up.

---

## Out of v2 scope

For founder discipline, here is what v2 explicitly does NOT include.
These are real ideas. They are not "no forever" — they are "no for
this scope."

- **Native mobile apps.** PWA is the bridge. Native is v3.
- **Multi-currency.** v3.
- **SSO / SAML / enterprise login.** v3.
- **HIPAA-grade compliance for medspas.** Significant scope; v3 if
  the medspa vertical pulls hard enough.
- **A second admin team member role.** v1 + v2 admin is single-
  operator. v3 will distinguish "support" from "developer" admin.
- **Public API.** v3. Owners can use Zapier in the meantime.
- **AI features.** AI-generated portfolio descriptions, AI customer
  intake forms, AI booking assistants. All interesting; all v3.
- **Cross-tenant marketplace.** Letting a customer discover and book
  any BookReady tenant from one app. Big v3 bet.

---

## Founder decisions (locked 2026-06-12)

1. **Salon plan rollout** → **deferred to v3 (demand-gated).** Don't
   build Salon scope until real signal surfaces (inbound Salon
   inquiries, Studio tenants requesting multi-location, or Studio
   plan cap saturation). v2 focuses on making Studio the dominant
   path for studios of two to five staff, including the multi-tenant
   identity work that makes chair-renter setups feel native. Salon
   strategy (self-serve vs sales-led) carries to v3.

2. **Recurring appointments** → **deferred to v3.** When it ships,
   it's a per-tenant toggle: each owner decides whether their menu
   offers recurring booking at all, and picks the charging model
   (deposit + per-visit, all-prepaid, or owner-customizable per
   service). The all-prepaid-only path is dead.

3. **PWA push notifications** → **each staff opts in individually
   for their own bookings; owner sees everything.** Default state
   for new staff is opted out; the staff member toggles their own
   push consent in their personal settings. Owner toggle covers all
   tenant activity (every staff's bookings, payments, cancellations).

4. **v2 build cadence** → **starts immediately (today).** No
   waiting for v1 launch. Testing tenants are the canary cohort that
   proves out the continuous-update flow itself; how updates feel
   from the tenant's perspective is part of what v2 has to get
   right.

5. **v3 graduation gate** → **250 active paying tenants OR
   2026-07-15, whichever comes first.** v3 planning runs in parallel
   with v2 build (see docs/v3-roadmap.md). Whichever threshold trips
   first, v3 work starts the following Monday.

---

## Document scope

This is the engineering-side v2 plan. It pairs with two other planning
documents that should exist alongside it:

- **v2 marketing plan**: SEO sprints, paid acquisition tests,
  influencer + creator partnerships, content production calendar
- **v2 customer success plan**: onboarding sequences, in-product tour
  improvements, support workflows, churn prevention emails

Both are out of scope for this document.

Owner: Luis Carreno. Engineering co-lead: Claude. Cadence: review
weekly during v2 build, adjust sequencing based on early-access tester
feedback and conversion data.
