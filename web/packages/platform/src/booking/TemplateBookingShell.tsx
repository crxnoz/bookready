'use client'

/**
 * TemplateBookingShell — the standard wrapper every template shim uses
 * to embed the PlatformBookingFlow.
 *
 * Phase 5 of the booking-architecture refactor (docs/booking-
 * architecture.md). The six non-Lush template shims (TFR / VT / Bottega
 * / Petale / Opaline / Blackline) each had the same 9-line wrapper
 * pattern:
 *
 *   <CustomerAuthProvider>
 *     <style>{PLATFORM_BOOKING_CSS}</style>
 *     <style>{TEMPLATE_THEME_CSS}</style>
 *     <div className={frameClass}>
 *       <div className={`lush-template ${scopeClass}`}>
 *         <PlatformBookingFlow {...props} />
 *       </div>
 *     </div>
 *   </CustomerAuthProvider>
 *
 * Extracting it here means: adding a new template = define a theme CSS
 * string, pick frame + scope class names, and use the shell. No more
 * copy-paste of the 9-line wrap.
 *
 * Lush is intentionally NOT a consumer — its booking renders directly
 * inside LushStudioTemplate's own page chrome (no separate frame).
 */

import type { ReactNode } from 'react'
import { LushCustomerAuthProvider } from './LushCustomerAuth'
import { LUSH_CSS as PLATFORM_BOOKING_CSS } from './lushBookingCss'

interface Props {
  /**
   * Outer "chrome" class — positions the booking in the template's page
   * (vertical padding, page background bleed). Engine size contract
   * does NOT apply here; this is the template's surface choice.
   */
  frameClass: string

  /**
   * Inner scope class for the template's cascade overrides.
   * Conventionally `<slug>-booking-inner`. The shell pairs it with
   * `.lush-template` (the cascade anchor that booking-engine rules
   * resolve against).
   */
  scopeClass: string

  /**
   * Template-specific theme CSS — colors, fonts, radius tokens,
   * decorations. Should NOT set sizes/padding/typography sizing on
   * `.brk-booking-*` selectors (Phase 3 contract). Optional: a
   * template that's content with engine defaults can skip it.
   */
  themeCss?: string

  /**
   * The PlatformBookingFlow element rendered with this template's
   * forwarded props.
   */
  children: ReactNode
}

export function TemplateBookingShell({
  frameClass,
  scopeClass,
  themeCss,
  children,
}: Props) {
  return (
    <LushCustomerAuthProvider>
      <style>{PLATFORM_BOOKING_CSS}</style>
      {themeCss ? <style>{themeCss}</style> : null}
      <div className={frameClass}>
        <div className={`lush-template ${scopeClass}`}>
          {children}
        </div>
      </div>
    </LushCustomerAuthProvider>
  )
}
