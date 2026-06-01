# Marketplace work — paused, resume notes

**Status:** Paused pending legal/tax setup. Engineering foundation is solid; this document captures the state precisely so we can resume without re-discovering anything.

**Last touched:** Phase 0 step 2 — `@bkrdy/platform` package extracted, all consumers retargeted. All 8 production tenants verified green after deploy.

---

## TL;DR for the future you reading this

The marketplace platform is built. What stopped us isn't engineering — it's the legal/tax/payments setup needed to actually accept money from creators in our jurisdiction. Before resuming engineering work, sort the items in §3 below. After that, the engineering queue in §4 picks up cleanly from where M2c.2-4 left off.

---

## 1. What shipped (the foundation, all live in prod)

The engineering audit + standardization that took us from "3 templates, ad-hoc structure" to "marketplace-ready platform":

| Milestone | Artifact | Where it lives |
|---|---|---|
| M1 | Tokens + per-template manifests + registry | `packages/platform/src/{tokens,manifest,useTemplateManifest}.ts` + each template's `manifest.ts` |
| M2a | Lush booking + auth + widget relocated to shared module | `packages/platform/src/booking/` |
| M2b | LUSH_CSS extracted to its own file | `packages/platform/src/booking/lushBookingCss.ts` |
| M2c.1 | `.lush-booking-*` → `.brk-booking-*` rename across 353 occurrences | same |
| M3 | End-to-end field rename: `before_after`→`results`, `steps`→`advice`, `before_appointment`→`timeline` (DB tables, JSON keys, section_keys, types, API helpers, editor, all 3 templates) | tenant migration `2026_06_01_000001_rename_*` + ~40 touched files |
| M4 | Editor reads each template's manifest; per-template `TemplateDefaults` branches | `WebsiteHub.tsx` + `api/app/Support/TemplateDefaults.php` |
| M5 | Audit compliance fixes — VT reviews rendered, VT tablist ARIA, Lush sage-hex bug, TFR undeclared vars, auth modal focus trap | various |
| Phase 0 step 1 | Manifest JSON Schema + runtime validator + AUTHORING.md + `_example-blank/` starter | `packages/platform/src/{manifest.schema.json,validateManifest.ts}` + `packages/platform/AUTHORING.md` + `templates/_example-blank/` |
| Phase 0 step 2 | `@bkrdy/platform` package extracted via TypeScript path alias | `web/packages/platform/` + `web/tsconfig.json` paths |

Net result: any new template just needs to write its `manifest.ts` + render component + wrap `PlatformBookingFlow`. The platform contract is documented in [AUTHORING.md](./AUTHORING.md).

---

## 2. Audit-found compliance fixes that landed but are worth re-checking on resume

These all shipped in M5, but if any have regressed since paused-date, re-verify:

- VT renders `additionals.reviews.*` (was a hard gap)
- VT `.vt-tabs-inner` has `role="tablist"` (a11y)
- Lush staff-picker + payment-choice tiles use `var(--lush-pink)` not hardcoded `#7FAF9A`
- TFR `.tfr-template` declares `--tfr-display` + `--tfr-fg` (they were undeclared, silently inheriting)
- Auth modal in `packages/platform/src/booking/LushCustomerAuth.tsx` has full focus trap

---

## 3. Blocking-on-legal-or-tax (do these BEFORE resuming engineering)

The work that paused us. None is engineering. Roughly in order of lead time:

### 3.1 — Tax compliance review

Marketplace tax law: in some US states + most of EU, BookReady is deemed the "marketplace facilitator" and is on the hook for sales tax collection + remittance even though creators are nominally selling their own templates. Stripe Tax helps but doesn't fully discharge the obligation.

**Action items:**
- Engage a tax advisor familiar with online marketplace sales tax
- Identify which states / countries actually require us to collect
- Decide whether Stripe Tax is configured "as the seller of record" or pass-through
- Plan 1099-K issuance for high-earning creators ($600+/year in US)
- Set up a creator earnings statement / W-9 collection flow

**Lead time:** 3-6 weeks (advisor engagement, opinion letter, internal review)

### 3.2 — Creator Agreement

The legal contract creators sign before submitting templates. Covers:
- Revenue share (we previously chose 30% — see §6)
- IP terms (creator retains copyright; BookReady gets a license to host + distribute)
- Refund policy (we previously chose 14-day full refund window)
- Content guidelines (no infringing brands, no unsafe content, design quality bar)
- Termination clause (what happens to a template if creator quits or is removed)
- Liability + indemnification

**Action items:**
- Engage a SaaS contract lawyer
- Draft v1 of the agreement
- Decide whether US-only creators initially or international from day 1 (changes governing-law clause significantly)

**Lead time:** 4-8 weeks

### 3.3 — Updated Marketplace Terms of Service

The contract tenants accept when buying a template. Currently the BookReady ToS doesn't anticipate template purchases. Needs:

- Template purchase as a separate transaction (not part of the subscription)
- Refund mechanics (mirror creator agreement)
- What happens if a creator's template is removed mid-subscription
- BookReady's role as marketplace facilitator (limits liability for template defects)

**Lead time:** 2-4 weeks (after Creator Agreement is drafted; they should be co-reviewed)

### 3.4 — Decide: launch posture

Two strategic decisions that affect engineering priorities post-resume:

- **Geo:** US-only or international from day 1? International adds VAT + GDPR + multi-currency surface.
- **Catalog seed:** how many templates at launch? Three (TFR/Lush/VT — all free, BookReady-owned) is the minimum. Five or more (with a paid third-party or two) gives demand signal.

---

## 4. Engineering queue (in order, resume from top)

When the legal/tax work in §3 is done, the engineering queue is:

### 4.1 — M2c.2-4 (the booking-primitive finish)

The only piece of Phase 0 left. Three sub-steps:

- **M2c.2** — Drop `.lush-template` scope qualifier from booking-flow CSS rules in `packages/platform/src/booking/lushBookingCss.ts`. Today rules look like `.lush-template .brk-booking-card`; need to become `.brk-booking-card` so any template can wrap the booking without inheriting `.lush-template`. Risky: some rules may legitimately need to be Lush-scoped. Audit each scope strip.

- **M2c.3** — Add `--brk-booking-*` CSS variable theming hooks. Replace hardcoded color/font values with `var(--brk-booking-X)` references. Tokens needed: `--brk-booking-bg`, `--brk-booking-fg`, `--brk-booking-muted`, `--brk-booking-accent`, `--brk-booking-on-accent`, `--brk-booking-card`, `--brk-booking-border`, `--brk-booking-serif`, `--brk-booking-sans`. Each template binds its own colors in its scope.

- **M2c.4** — VT shim drops its `--lush-pink` override block. Now binds `--brk-booking-accent` directly to gold (`#C9A876`). Cleaner; one canonical platform var per concept.

- **Optional M2c.5** — Migrate TFR's booking to wrap `PlatformBookingFlow`. Currently TFR has its own 1686-line copy of the booking flow. After M2c.3's theming hooks, TFR's pink + glow palette can be expressed as variable bindings instead of a fork. Highest-payoff but riskiest because TFR's design vocabulary differs (rounded pink chrome vs Lush's flat sage cards).

Task #295 captures this. Estimate: 1-2 fresh-context sessions.

### 4.2 — Phase 1: npm workspaces + publish `@bkrdy/platform` to npm

Today `@bkrdy/platform` is a TypeScript path alias inside the monorepo. To let 3rd-party creators `npm install @bkrdy/platform`:

- Set up npm or pnpm workspaces in a new root `package.json`
- Flip `web/packages/platform/package.json` to `private: false`
- Publish to npm (use Anthropic-controlled `@bkrdy` scope; needs npm org setup)
- Each Anthropic-built template (`@bkrdy-template/the-fade-room`, `@bkrdy-template/lush-studio`, `@bkrdy-template/velvet-theory`) becomes its own published package
- Deploy script gets an `npm install` step at root before `cd web/` (workspaces hoist deps)
- CI publishes packages on tag

**Risk:** touches the deploy script. Test on staging first.

### 4.3 — Phase 2: submission portal + review pipeline

Build the actual marketplace plumbing:

- Submission portal at `/admin/marketplace/submissions` (form: name, slug, description, price, screenshots, repo URL, npm package URL)
- Automated checks pipeline:
  - `validateManifest()` against `manifest.schema.json` (already built)
  - Build succeeds against `@bkrdy/platform` types
  - No banned imports (no `fs`, no `eval`, no `<script>` injection)
  - Bundle size under thresholds (~500KB JS, ~100KB CSS)
  - No hardcoded `https://app.bkrdy.me` URLs
  - All declared `header_fields` / `footer_fields` actually render (static analysis)
  - Renders against synthetic PublicSite fixture without errors
- Review queue UI at `/admin/marketplace/queue` with checklist + approve/reject
- Preview env provisioner: `preview-<submission-id>.preview.bkrdy.me` spins up a demo tenant on the submitted template
- Submission state machine: Draft → Submitted → InReview → Changes Requested → Approved → Published → Deprecated

Substantial work. 3-5 sessions.

### 4.4 — Phase 3: payments + Stripe Connect for creators

The revenue-share plumbing:

- Creator account extension on `users`: `is_template_creator`, `stripe_connect_account_id`
- `/creator` dashboard route group (separate from tenant `/editor`)
- New tenant table `template_purchases` (template_slug, purchased_at, price_cents, stripe_charge_id, refunded_at)
- `MarketplaceCheckoutService` — Stripe checkout session for template purchase, 70/30 split via Stripe Connect destination charges
- Webhook handler for marketplace purchase events
- Refund flow: tenant requests within 14-day window, auto-approved via Stripe refund API; refund clawed back from next creator payout
- Stripe Tax wiring (depends on §3.1 decisions)

Substantial work. 3-4 sessions, plus blocked on §3 completion.

### 4.5 — Phase 4: admin marketplace + per-tenant template assignment (v1 UX)

The minimal v1 tenant UX per the original plan ("no UI yet — ship the marketplace as a backend/curation thing first"):

- Admin marketplace dashboard at `/admin/marketplace` (approved templates, submission queue, pending payouts, marketplace KPIs)
- Per-tenant template assignment in `/admin/tenants/{id}` (admin can change a tenant's active template, grant a paid template for free)
- No public template picker in the tenant editor yet — that's Phase 5
- Tenants who want a 3rd-party template email BookReady; team assigns via admin or sends a Stripe Payment Link for paid templates

Smaller work. 1-2 sessions, mostly reusing existing admin UI patterns.

### 4.6 — Phase 5: tenant-facing marketplace catalog (held off for now)

When demand justifies, build the public template catalog at `/editor/marketplace` with filters, previews, purchase flow, ratings, etc. Not blocking initial launch.

---

## 5. Decisions already made (don't re-litigate)

These were settled before pause:

- **Creators:** Open submission with review (Shopify Theme Store model)
- **Revenue:** Paid templates with revenue share. Pricing model: **one-time purchase**, no subscription. Revenue split: **70% creator / 30% BookReady**. Refund window: **14 days** for tenants.
- **Code location:** Templates as **separate npm packages**, each published under `@bkrdy-template/*` (Anthropic-built) or `@<creator-scope>/*` (3rd-party)
- **Tenant UX at v1:** Backend curation only. No public template picker in tenant editor until Phase 5.
- **Platform package name:** `@bkrdy/platform`
- **Manifest contract:** Closed `additionalProperties` in the JSON Schema — no extension creep without an explicit RFC
- **Free templates:** TFR, Lush, VT all free (price = 0). Anthropic-built; not subject to revenue share.

---

## 6. Open questions to revisit before resuming

In rough order of urgency:

1. **Tax: deemed-seller status.** Where does BookReady become "the seller" for tax purposes vs. just being a facilitator? Stripe Tax docs are not law. → §3.1
2. **International creators from day 1?** Adds VAT + GDPR data residency + currency surface. Could stage-gate to US-only first 6 months. → §3.4
3. **Quality bar for submissions.** What gets a borderline template rejected? Need a written rubric so reviews are consistent and creator feedback is actionable.
4. **Creator KYC depth.** Stripe Connect Express handles basics, but high-earning creators trigger 1099-K + maybe additional verification. Lead-time on the W-9/W-8 collection UX.
5. **Versioning + breakage policy.** When `@bkrdy/platform` v0.x → v1.0, what's the creator-side migration commitment? AUTHORING.md says "30 days notice for breaking changes" — confirm that's compatible with the support cadence we can actually staff.
6. **Anthropic-built templates count toward catalog at launch?** Yes for catalog credibility; but they distort metrics ("look, 4 templates published in week 1!" — 3 are ours). Keep separate dashboards.

---

## 7. File pointers (where to look on resume)

The marketplace surface, in order of "look here first":

- `web/packages/platform/AUTHORING.md` — creator-facing contract
- `web/packages/platform/MARKETPLACE_TODO.md` — this file
- `web/packages/platform/package.json` — package contract (currently `private: true`)
- `web/packages/platform/src/manifest.schema.json` — formal manifest contract
- `web/packages/platform/src/validateManifest.ts` — runtime validator (same checks)
- `web/packages/platform/src/booking/index.ts` — platform-canonical exports (PlatformBookingFlow, CustomerAuthProvider, PLATFORM_BOOKING_CSS, etc.)
- `web/templates/_example-blank/` — official starter
- `web/tsconfig.json` — path aliases for `@bkrdy/platform`

Task tracker (in the harness, not on disk) has the per-milestone tasks:
- Tasks M1, M2a/b, M2c.1, M3, M4, M5, Phase 0 step 1, Phase 0 step 2 — completed
- Task M2c.2-4 — pending
- Tasks for Phase 1+ — not yet created; create when resuming with §4 above as the source of truth

---

## 8. Resume checklist

When ready to resume:

1. ✅ Read this file end-to-end
2. ✅ Confirm §3 (legal/tax) is settled — get written confirmation from tax advisor + signed Creator Agreement template
3. ✅ Decide §6.4 (international) — affects all subsequent engineering
4. ✅ Pick the next engineering item from §4 (recommended: start with M2c.2-4, the only piece of Phase 0 left)
5. ✅ Re-verify §2 compliance items haven't regressed
6. ✅ Sanity-check the 8 tenant sites still render (`thefaderoom`, `lushstudio`, `lusheststudio`, `youtests`, `beautiful`, `camila`, `freshfaderoom`, `isra`)
7. ✅ Create fresh task records for the resumed work

---

*If anything in this document is unclear, the git log around the paused-date commits + the task descriptions for #288–#297 will fill in context.*
