import OnboardingWizard from '@/components/editor/OnboardingWizard'

// Full-screen onboarding flow. Deliberately NOT wrapped in EditorShell —
// the wizard owns the whole viewport (no sidebar/tabs) so it reads as a
// focused first-run experience. EditorGuard (the (editor) layout) still
// gates auth. The dashboard redirects new tenants here until they finish
// or skip; this page redirects already-onboarded tenants back to /editor.
export default function OnboardPage() {
  return <OnboardingWizard />
}
