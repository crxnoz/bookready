# BookReady v3 — Roadmap

Last updated: 2026-06-12

## What v3 is

v3 is what we build AFTER hitting either of the v2 graduation
thresholds:

- **250 active paying tenants**, or
- **2026-07-15**

whichever comes first.

Until then, v2 is the focus. v3 planning runs in parallel so we don't
land at the threshold without a plan, and so v2 sequencing decisions
can be made with v3 implications visible.

Where v2 is "polish the product we already have" + "close the gaps
testers complain about," v3 is **"build the features that turn
BookReady from a booking tool into a platform."** Custom domains,
template marketplace, memberships, and referrals are the obvious
batch. The harder bets — multi-currency, native apps, public API,
medspa-specific compliance — also land in v3 if the conversion +
retention signal supports them.

Three rules for v3 scoping:

1. **v2's data tells us what v3 should be.** Don't lock v3 sequencing
   until v2 metrics are at least 30 days mature.
2. **v3 themes that v3 isn't really sure about stay in "Exploratory"
   below.** They're seeded for thinking, not committed for building.
3. **Platform features (template marketplace, public API) are v3's
   identity.** Don't dilute v3 with another round of v2-style polish.

For comparison and shared context, see [docs/v2-roadmap.md](./v2-roadmap.md).

---

## Part 1 — Themes deferred from v2

These five themes were planned for v2 (full design captured in the
v2 doc, marked with "POSTPONED TO v3" banners) and then deferred on
2026-06-12. Each theme below is a brief reminder; v2 doc is the
authoritative reference for scope, acceptance criteria, and effort.

### v3 Theme 1: Custom domain UI

The `allows_custom_domain` flag is already set TRUE for Studio and
Salon in PlanFeatures. v3 ships the connector UI (settings tab),
DNS poller, Caddy/Nginx custom-domain config, and Let's Encrypt
automation. Pairs naturally with v3's marketing push around
white-label.

**Effort:** 3 engineering days
**Dependency:** Decision on Cloudflare-proxy vs direct (still open;
deferred from v2 open questions)

### v3 Theme 2: Templates platform

By v3 launch we'll have v2 conversion data on the existing nine
templates. Use it to pick which two vertical templates to add (top
candidates from v2 doc: dedicated tattoo studio, permanent makeup
specialists, hair extensions specialists, mobile beauty). Also build
the template preview surface on mybookready.com/templates and the
in-editor template switcher that doesn't lose tenant content.

**Effort:** 4-6 engineering days
**Dependency:** Marketing-side data on signup intent by vertical

### v3 Theme 3: Membership / package sales

Owner creates packages (5 brow lifts for $300, monthly unlimited
brow tints, etc.). Customer purchases, gets balance, redeems on
booking. Memberships are recurring packages with auto-renewal via
Stripe Connect. Reporting: package revenue, redemption rate,
expiration forecast.

**Effort:** 5 engineering days
**Dependency:** Recurring appointments (v3 Theme 4) wiring shares
some infrastructure

### v3 Theme 4: Recurring appointments

Moved from v2 on founder call (all-prepaid model too heavy, per-visit
adds Stripe complexity). v3 ships as a **per-tenant toggle**: each
owner decides whether their service menu offers recurring booking at
all, and picks the charging model (deposit + per-visit, all-prepaid,
or per-service customizable). The toggle UX lives in
/editor/services per-service or as a global tenant setting depending
on what v2 customer feedback suggests.

**Effort:** 4 engineering days (down from earlier estimate because
the per-tenant toggle reduces the cross-tenant edge cases)

### v3 Theme 5: Payments polish

Stripe Tax integration for sales tax automation. Tipping enhancements
(service-aware tip suggestions, one-tap re-tip, owner presets).
Refund automation (in-app refund button replaces the Stripe-dashboard
trip). Failed payment retry strategy. End-to-end payments surface
finally feels finished.

**Effort:** 4 engineering days
**Dependency:** Stripe Tax enrollment (founder-side)

### v3 Theme 6: Referral program

Every tenant gets a referral link. Successful referral earns the
referring tenant one month free, referee converting earns another
month free, stackable rewards. /editor/referrals dashboard. Highest-
leverage growth mechanism for v3 once the v2 product surface is
stable enough that referees don't bounce on rough edges.

**Effort:** 3 engineering days
**Dependency:** Stripe Cashier credit support (verified working)

### v3 Theme 6.5: Salon plan rollout (demand-gated)

Originally v2 Theme 3. Deferred 2026-06-12: hold Salon work until
real demand surfaces. v2 focuses on making Studio indisputable for
two-to-five staff. Salon work begins in v3 when triggered by ANY of:

- 10+ inbound Salon-segment inquiries (track via hello@mybookready
  inbox + the contact form)
- 5+ Studio tenants asking for multi-location or staff-cap relief
- Studio tenants saturating the 5-seat cap and the natural next step
  would have been "go up a tier"

Scope when work starts:

- Decide self-serve CSV migration vs sales-led hybrid (see v2 doc
  founder explanation on trade-offs)
- Multi-location data model (one tenant → N locations, each with
  its own staff + hours + Stripe Connect account)
- CSV import flows from Mindbody / Boulevard / Phorest / Vagaro /
  SalonIQ for the four data types (appointments, customers,
  services, staff)
- Cross-location reporting (revenue per location, per-staff across
  locations)

**Effort when triggered:** 5-10 engineering days depending on
self-serve vs sales-led path

**Dependency:** Demand signal as above. Until trigger, the only
ongoing work is **tracking that signal**: weekly review of the
hello@ inbox for Salon-segment inquiries, monthly check of which
Studio tenants are at or near the 5-seat cap.

---

## Part 2 — New v3 themes (originally "Out of v2 scope")

### v3 Theme 7: Multi-currency

v1 + v2 are USD only. v3 opens the door for international tenants.
Scope: per-tenant currency selection at signup, currency-aware
booking flows, Stripe Connect in non-USD regions, owner reporting in
their primary currency.

**Effort:** 6 engineering days
**Dependency:** Stripe Connect availability per region (varies);
some currencies require manual Stripe support enable

**Out of scope for v3:** dynamic currency switching at the customer
level (customer always pays in the tenant's currency). FX support
is v4.

### v3 Theme 8: Native mobile apps (post-PWA)

v2 ships the PWA bridge. v3 either ships native iOS + Android wrappers
(React Native, Expo) OR commits to PWA-only based on actual install
+ engagement data from v2.

**Effort:** 12-15 engineering days for the wrapped path
**Dependency:** v2 PWA install rate signal. If installs are low,
native isn't worth the build cost.

### v3 Theme 9: HIPAA compliance for medspas

Medspas are 15-30% of our target market. Most medspa software at
their price point (Mangomint, AestheticRecord) is HIPAA-compliant.
BookReady is not. v3 either builds the compliance layer (BAA with
storage providers, audit logs, encrypted PHI fields, sensitive-data
retention controls) or explicitly punts the medspa segment until
v4.

**Effort:** 8-10 engineering days + legal review + ongoing
compliance overhead
**Dependency:** Founder decision on whether medspa is a v3 segment
or a v4 segment

**Reality check:** HIPAA compliance is expensive to maintain. Don't
commit to it without a clear pipeline of medspa prospects asking for
it. If 30%+ of our Studio + Salon prospects are medspas, build it.
If less, defer.

### v3 Theme 10: Public API

Open the API for tenant-side automations. Today only Zapier (v2)
gives outside-the-product programmatic access. v3 opens the same
endpoints to tenants with API keys. Use cases: custom integrations
with the tenant's existing tools, white-label partners, developer-
focused tenants who want to build on top.

**Effort:** 5 engineering days (auth + rate limiting + docs site)
**Dependency:** Stable v2 API surface; can't expose an API that
changes shape every sprint

### v3 Theme 11: SSO / SAML

For enterprise salons (multi-location, 50+ staff). Login via
Okta / Google Workspace / Azure AD. Tied to the enterprise Salon
tier from Theme 3 (v2 doc).

**Effort:** 4 engineering days
**Dependency:** A real enterprise customer asking for it; don't
build SSO speculatively

### v3 Theme 12: Customer-facing marketplace

The big bet. mybookready.com becomes a marketplace where consumers
discover and book any BookReady tenant in their area. Search by
service, by neighborhood, by stylist. Reviews, photos, instant
booking. Network effect: tenants attract bookings from the
marketplace; customers see a discovery surface beyond Instagram.

This is essentially BookReady becoming a tiny Booksy or StyleSeat
inside our existing product. It changes the company's nature.

**Effort:** 15-25 engineering days
**Dependency:** Founder strategy call. The marketplace play either
becomes the central v3 bet (everything else supports it) or it
doesn't happen. There's no middle.

### v3 Theme 13: AI features

Three candidate areas:

1. **AI portfolio descriptions.** Stylist uploads a photo, AI
   generates a service description that matches the brand voice.
2. **AI customer intake.** PMU and medspa tenants ask new customers
   25+ pre-appointment questions. AI synthesizes the responses into a
   prep summary for the practitioner.
3. **AI booking assistant.** Customer types "I want a balayage for
   my friend's wedding in 3 weeks" and the AI suggests services,
   timing, and stylist match.

All three are v3 explorations not v3 commitments. Each is 3-5
engineering days plus ongoing AI cost monitoring.

**Effort:** 12-15 engineering days for all three
**Dependency:** Anthropic API budget approval, AI feature pricing
model decision (included in plan vs metered add-on)

### v3 Theme 14: Cohort analytics + predictive churn

Beyond v2's smarter dashboards. Cohort retention curves, customer
LTV with confidence intervals, predictive churn signals ("this
customer hasn't booked in 90 days; they have a 70% chance of
churning"), revenue forecasting.

**Effort:** 4 engineering days
**Dependency:** Sufficient data volume — predictive features need
6+ months of tenant history to be meaningful

### v3 Theme 15: Two-step admin role differentiation

v1 + v2 admin is single-tier (you're admin or you're not). v3 splits
into "Support" (read-only + customer service tools) and "Engineering"
(full destructive access). Required once we have a support team.

**Effort:** 2 engineering days
**Dependency:** Hiring a support team member

---

## Part 3 — Sequencing (loose; will firm up at v3 kickoff)

v3 sequencing is intentionally rougher than v2's because v3 themes
depend on v2 outcomes. The order below reflects best guesses, not
commitments.

### Tier 1 (first 8 weeks of v3): direct revenue impact

1. **Membership / package sales** (Theme 3) — biggest revenue lever
2. **Recurring appointments** (Theme 4) — customer retention
3. **Referral program** (Theme 6) — growth flywheel
4. **Custom domain UI** (Theme 1) — Studio+ feature gap
5. **Salon plan rollout** (Theme 6.5) — IF demand trigger has fired
   by v3 kickoff; otherwise stays parked in demand-watch mode

### Tier 2 (weeks 9-16): platform foundations

5. **Templates platform** (Theme 2) — preview surface + switcher
6. **Payments polish** (Theme 5) — finish the payments story
7. **Multi-currency** (Theme 7) — opens international segment

### Tier 3 (weeks 17-24): platform plays

8. **Customer-facing marketplace** (Theme 12) IF founder commits;
   otherwise punt to v4
9. **Public API** (Theme 10)
10. **HIPAA compliance** (Theme 9) IF medspa segment justifies

### Tier 4 (weeks 25+): exploratory

11. **Native mobile apps** (Theme 8) IF PWA data supports
12. **AI features** (Theme 13) IF budget + product fit hold
13. **Cohort analytics** (Theme 14)
14. **SSO / SAML** (Theme 11)
15. **Admin role differentiation** (Theme 15)

---

## Open questions (decide before v3 kickoff)

1. **Cloudflare proxy vs direct for custom domain hosting?** Carried
   over from v2 open questions. Cloudflare easier on SSL/DDoS,
   direct cleaner on debugging. Decide before v3 Theme 1 starts.

2. **Which 2 new template verticals for the Templates platform?**
   Need v2 conversion data by vertical to decide. Top candidates:
   dedicated tattoo, PMU, hair extensions, mobile beauty.

3. **Referral reward: credit toward subscription, or cash?** Credit
   is simpler and locks in retention. Cash converts higher but adds
   tax + accounting complexity.

4. **Marketplace: build it or skip it?** The biggest v3 decision.
   Marketplace fundamentally changes the company's nature
   (B2B2C → marketplace). If we commit, it becomes the central v3
   bet. If we skip, the company stays a software vendor.

5. **HIPAA compliance: commit or defer?** Depends on whether 30%+ of
   our Studio + Salon prospects are medspas. Need v2 segmentation
   data.

6. **AI features pricing model?** Included in plan vs metered
   add-on. Affects how aggressively we ship Theme 13.

7. **Native mobile decision criteria.** What PWA install rate or
   engagement signal would justify the native build cost? Need a
   number set in advance so the decision is data-driven, not
   intuition-driven.

8. **v3 graduation gate?** When does v3 end and v4 begin? Suggested:
   when the marketplace (if built) reaches consumer scale, OR when
   we have 2,000+ paying tenants, whichever first.

---

## What's NOT in v3 (i.e., v4)

For scope discipline:

- **International tax (FX, regional VAT, etc.)** beyond Stripe Tax.
  Multi-currency in v3 enables non-USD bookings; full international
  tax automation is v4.
- **Enterprise contracts + custom pricing.** Salon tier in v3 stays
  self-serve OR sales-led; enterprise contracts (annual commits,
  custom MSAs) are v4.
- **White-label reseller program.** Other companies reselling
  BookReady under their own brand. v4 at earliest.
- **Workflow automation builder.** Tenants building their own
  multi-step automations (similar to Notion's automations).
  Powerful but heavy; v4.
- **AI-generated booking copy + ad creative.** Plays nicely with
  v3 Theme 13 (AI features) but the creative end is v4.
- **Voice booking.** Customer calls a Twilio number, AI takes the
  booking. Cool, expensive, v4.
- **POS / physical product sales.** Some salons sell retail
  alongside services (shampoo, skincare). Adding inventory + POS is
  a different product. v4 or never.

---

## Document scope

This is the engineering-side v3 plan. It mirrors v2's structure so
the founder can compare scope quickly. v3 marketing plan and v3
customer success plan are separate documents that should exist by
the time v3 kickoff happens.

Owner: Luis Carreno. Engineering co-lead: Claude. Cadence: revisit
this doc once v2 mid-point metrics are available (~4 weeks into v2
build), and again at v3 kickoff.
