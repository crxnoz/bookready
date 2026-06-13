# Dormant: OnboardingWizard.tsx

Status: **DORMANT** as of 2026-06-13.

## What it was

`web/components/editor/OnboardingWizard.tsx` was a 5-step full-screen wizard that fired on the first `/editor` load until `business_profiles.onboarding_completed_at` was set. Steps: Business → Services → Hours → Policies → Stripe Connect (skippable).

Mounted at `/editor/onboard`, routed there by `/editor/page.tsx` on `!onboarding_completed_at`.

## Why it was retired

The signup redesign v2 (see `signup_drafts` migration `2026_06_13_000002_create_signup_drafts_table.php`) moved all "business identity" collection (name / tagline / type / starter services) OUT of the editor and INTO the pre-tenant signup flow at `/signup/business`. After provisioning, the owner lands directly on `/editor` with the dashboard's setup checklist (Add more services / Set hours / Add policies / Connect Stripe Connect / Upload hero images / Publish website) handling the rest in-context.

The wizard's purpose — onboarding inside the dashboard — disappeared. Its file is left in tree intentionally for a fast revert if the new flow underperforms.

## How to revive

If conversion data shows the dashboard checklist isn't enough and we need to re-introduce a full-screen wizard:

1. Restore `AuthController::isOnboardingComplete` to read from `business_profiles.onboarding_completed_at` (currently always returns `true`).
2. Re-add the `onboarding` state in `redirectFor`. It used to be:
   ```php
   if (! $onboardingComplete) return '/editor/onboard';
   ```
   between the business/website setup and the plan step.
3. Re-add `/editor/onboard` to the EditorGuard's pass-through list — already there.
4. The component itself is unchanged; just `import OnboardingWizard from '@/components/editor/OnboardingWizard'` from `/editor/onboard/page.tsx`. That file may also be dormant — check the same git history.

## What changed alongside the retirement

- `AuthController::isOnboardingComplete` → always returns `true` (vestigial)
- `BusinessProfileController::completeOnboarding` → still functional, still mirrors to `tenants.onboarding_completed_at`. No callers in the new flow.
- `tenants.onboarding_completed_at` column → vestigial. Backfill kept it pointing at `provisioned_at` for consistency. Safe to drop in a later cleanup migration.

## Don't delete the file

Hard-deleting would require also reverting:
- `web/app/(editor)/editor/onboard/page.tsx`
- Test fixtures that mention the wizard
- Any analytics events that reference it

Leave it dormant for at least one release cycle. If conversion holds, drop in the cleanup PR.
