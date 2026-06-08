# BookReady Availability 2.0

> **Status: SPEC — not yet built. Post-launch v2 roadmap.**
>
> Decided 2026-06-08:
> 1. Launch ships on the existing weekly scheduling system.
> 2. Availability 2.0 phases roll out post-launch, informed by real cohort
>    feedback from the first 5-10 tenants.
> 3. `App\Services\SlotGenerator` — normally on the "what NOT to touch"
>    list in `CLAUDE.md` — is **explicitly authorized for modification**
>    when this build begins. Refactor phase-by-phase, not all at once.
>
> Read the full spec below (founder-authored), then the **Engineering
> notes** section at the bottom for the implementation plan, data model,
> known gaps, and re-ordered execution sequence.

---

## Goal

Replace the traditional Monday-Sunday scheduling experience with a modern calendar-first availability system built for beauty professionals, barbers, salons, spas, lash artists, makeup artists, and independent service providers.

The primary goal is to make availability feel flexible and realistic.

Availability should answer:

* When do I want to work?
* How many customers do I want to take?
* When should appointments become available?
* How can I generate additional revenue from my schedule?

The Smart Calendar becomes the primary scheduling interface.

Recurring schedules become optional helper tools.

---

# Phase 1 — Smart Calendar Foundation

## Objective

Create a calendar-first availability system.

### Features

Smart Calendar

* Monthly calendar view
* Click any date to edit availability
* Visual status indicators
* Quick month navigation

Individual Date Management

Each date can define:

* Available / Unavailable
* Start time
* End time
* Break periods
* Assigned staff
* Available services

Example

June 17

Available
✓

Hours
10:00 AM - 6:00 PM

Break
1:00 PM - 2:00 PM

Assigned Staff
All Staff

Services
All Services

Save

### Requirements

* Existing SlotGenerator remains untouched
* Date-specific settings override recurring schedules
* Existing businesses continue functioning normally
* Weekly schedule remains available as a fallback

### Success Criteria

Business owners can manage availability entirely through the calendar without touching weekly schedules.

---

# Phase 2 — Date Drops

## Objective

Allow businesses to control when appointments become available.

### Features

Release Strategy

○ Always Open
○ Weekly
○ Bi-Weekly
○ Monthly
○ Custom

Weekly

Release next 7 days
Every Monday

Bi-Weekly

Release next 14 days
Every other Friday

Monthly

Release next 30 days
On the first day of each month

Custom

Release Date
July 1

Available Dates
July 15 - July 30

### Requirements

* Integrate with existing booking window rules
* Respect maximum days ahead settings
* Calendar clearly displays unpublished dates

### Success Criteria

Businesses can operate entirely through scheduled availability drops.

---

# Phase 3 — Capacity Management

## Objective

Allow businesses to manage workload rather than only hours.

### Features

Daily Capacity

Maximum Customers Per Day

Example

June 17

Maximum Customers
8

Calendar Indicators

5 / 8 Available

7 / 8 Nearly Full

8 / 8 Full

### Staff Capacity

Per Staff Member

Alex
6 Appointments

Sarah
8 Appointments

Jordan
4 Appointments

### Visual Indicators

Green
Available

Yellow
Nearly Full

Red
Full

Gray
Closed

### Requirements

* SlotGenerator respects capacity limits
* Capacity works with existing appointment logic
* Capacity can be staff-specific or date-specific

### Success Criteria

Businesses can control workload without constantly adjusting hours.

---

# Phase 4 — After Hours

## Objective

Allow businesses to monetize availability outside normal working hours.

### Features

Enable After Hours

After Hours Fee

Maximum Extension

Time Window

Access Rules

Settings Example

After Hours
Enabled

Fee
$25

Maximum Extension
2 Hours

Latest Booking
8:00 PM

Who Can Book

○ Everyone
○ Existing Customers
○ VIP Customers

### Customer Experience

Available Times

6:30 PM
+$25

7:00 PM
+$25

7:30 PM
+$25

### Additional Capacity

Regular Capacity
8

After Hours Capacity
2

### Requirements

* Separate capacity tracking
* Separate pricing logic
* Supports deposits and Stripe payments

### Success Criteria

Businesses can generate additional revenue through premium time slots.

---

# Phase 5 — Availability Requests

## Objective

Capture booking demand even when no availability exists.

### Customer Flow

No Availability?

Request Appointment

Customer submits

* Preferred date
* Preferred time
* Service
* Notes

### Owner Flow

Availability Request

Approve

Suggest Alternative

Decline

### Requirements

* Creates no appointment until approved
* Integrates with notifications
* Tracks demand analytics

### Success Criteria

Lost bookings become opportunities.

---

# Phase 6 — Squeeze-Ins

## Objective

Allow businesses to sell limited premium booking opportunities.

### Features

Enable Squeeze-Ins

Additional Fee

Daily Limit

Access Rules

Settings Example

Squeeze-In Fee
$25

Maximum Per Day
2

Who Can Request

○ Everyone
○ Existing Customers
○ VIP Customers

Recommended Default

Existing Customers

### Customer Flow

Fully booked?

Request a Squeeze-In

+$25

### Owner Flow

Approve

Suggest Time

Decline

### Requirements

* Independent from normal capacity
* Tracks squeeze-in revenue
* Supports deposits and payment collection

### Success Criteria

Businesses can monetize excess demand.

---

# Phase 7 — Waitlist

## Objective

Automatically fill cancelled appointments.

### Features

Join Waitlist

Preferred Date

Preferred Staff

Preferred Service

Automatic Notification

Accept Spot

### Requirements

* Cancellation triggers waitlist processing
* Supports multiple customers per waitlist
* Optional first-come-first-served logic

### Success Criteria

Reduce lost revenue from cancellations.

---

# Phase 8 — Advanced Availability

## Objective

Consolidate advanced scheduling controls.

### Sections

Staff Availability

Blocked Dates

Holiday Closures

Service Availability

Calendar Overrides

Recurring Schedules

### Notes

This section serves advanced users.

Smart Calendar remains the primary experience.

### Success Criteria

Power users retain full control without overwhelming new users.

---

# Final Availability Structure

Availability

├── Smart Calendar
│
├── Date Drops
│
├── Capacity
│
├── After Hours
│
├── Availability Requests
│
├── Squeeze-Ins
│
├── Waitlist
│
└── Advanced Settings

The Smart Calendar becomes the source of truth for availability while recurring schedules become optional tools rather than the primary workflow.

---

# Engineering notes (not part of the founder spec)

The spec above is the founder's vision, captured verbatim. This section
captures the engineering analysis from the 2026-06-08 review and locks in
the decisions made.

## Locked-in decisions

1. **Build timing:** After launch. Real cohort feedback informs ~30% of
   design choices the spec can't anticipate (especially copy + payment
   timing on requests + VIP gating).
2. **SlotGenerator override:** Explicit authorization to modify. CLAUDE.md
   still lists it on the do-not-touch list for all other work — this is
   the singular exception.
3. **Spec is law for goals, not for implementation order.** The
   founder-ordered phases prioritize feature ambition; engineering-ordered
   phases prioritize build risk.

## Engineering-friendly phase order (re-ordered from spec)

The spec orders by feature ambition; engineering risk + dependency order
is different:

| Order | Phase | Why this position |
|---|---|---|
| 1 | **§1 Smart Calendar UI + per-date override** | Foundation. Layers atop SlotGenerator without changing its core. |
| 2 | **§8 Advanced Settings consolidation** | Pull existing surfaces under one nav BEFORE adding new ones complicates the picture. |
| 3 | **§3 Capacity Management** | Pure count check. No new payment paths. High owner-pain-point ROI. |
| 4 | **§7 Waitlist** | Fills cancellations. Biggest pure-revenue win. No new payment paths. |
| 5 | **§2 Date Drops** | Gating logic on the calendar. Builds on §1's date-override layer. |
| 6 | **§5 Availability Requests** | First phase with new request infrastructure (state machine, notification flow). |
| 7 | **§4 After Hours** | First phase with new pricing path (upcharge on regular booking). |
| 8 | **§6 Squeeze-Ins** | Reuses §4's pricing path + §5's request infrastructure. Last because it depends on the most. |

## Known gaps in the spec (decide before building)

1. **"VIP customer" concept doesn't exist yet.** Phases 4 + 6 gate by VIP
   tier. Needs definition: manual flag? Spend threshold? Lifetime
   appointments? Owner-managed list? This is its own feature.
2. **Payment timing on availability requests.** Pay BEFORE owner approval
   (hold + refund on decline via Stripe uncaptured intent), or pay AFTER
   approval (two-step UX)? Spec doesn't specify. Recommend: pay-after
   for v1, pay-before as a fast-follow.
3. **"Squeeze-in" customer vocabulary.** Owners say this; customers may
   not understand. Worth A/B copy test once we have traffic.
4. **Request SLA expectations.** "Request appointment" needs a stated
   response time so customers don't ghost ("We'll respond within 24h").
5. **After-hours fee labeling.** "+$25" chip needs a tooltip explaining
   it's an after-hours premium, not a hidden surcharge.

## Data model sketch (~7 new tenant tables)

| Table | Purpose |
|---|---|
| `calendar_overrides` | Per-date config: hours / break / capacity / assigned staff / available services. Replaces "weekly schedule" as primary source on dates where it exists; falls through to the weekly schedule otherwise. |
| `release_windows` | Date-drop schedule per tenant (strategy + cadence + custom releases). |
| `staff_daily_capacity` | Per-staff per-date overrides for capacity (Alex=6, Sarah=8). May collapse into a single `capacity` table with nullable staff_id. |
| `after_hours_config` | Tenant-wide rules: enabled, fee_cents, max_extension_minutes, latest_booking_time, access_tier. |
| `availability_requests` | Customer-submitted "I want this date" — status (pending/approved/declined/suggested), preferred date/time/service, owner_note. |
| `squeeze_in_requests` | Premium "fit me in" — same shape as above + fee tracking + payment_intent_id. |
| `waitlist_entries` | Cancellation queue — preferred date/staff/service, notified_at, claimed_at, expired_at. |

## Email + notification scope (5+ new templates)

- Availability request submitted (owner-facing alert)
- Availability request approved (customer)
- Availability request declined / alternative suggested (customer)
- Waitlist spot opened (customer) — with claim-by-X deadline
- Squeeze-in request submitted (owner alert)
- Squeeze-in approved (customer)
- After-hours booking confirmation (customer) — may extend existing
  confirmation template with conditional "you booked an after-hours slot"
  paragraph instead of new template

Coordinate with the §1A email audit on the launch checklist — the new
templates should follow whatever standards that audit settles.

## SlotGenerator change plan

Approach: refactor phase-by-phase, each phase pull-requests its own
SlotGenerator changes behind a tenant feature flag so we can disable a
phase per-tenant if it regresses.

Phase 1 changes: layer `calendar_overrides` lookup BEFORE the weekly
schedule lookup. If override exists for the date, use it; else fall
through. Zero behavior change for tenants without overrides.

Phase 3 changes: after the slot list is generated for a date, filter by
remaining capacity. New `capacity` joined to booking count.

Phase 4 changes: append after-hours slots to the regular list with a
`tier: 'after_hours'` flag + price_delta. Customer-side UI renders the
"+$25" badge.

Etc per phase. Always behind a flag, always with a backout path.

## Launch context

Per `docs/pre-launch.md`, the hard launch blockers are §1A (email audit),
§1B (text sweep), and §4 (security re-run). Availability 2.0 is on the
post-launch roadmap and **must not delay** these blockers.

Existing weekly scheduling continues to be the launch product. Once the
first 5-10 cohort tenants are live, the Phase 1 calendar UI ships as the
first v2 increment — additive, non-breaking — and we iterate from cohort
feedback.
