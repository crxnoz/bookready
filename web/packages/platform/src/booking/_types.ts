/**
 * Local types + constants for the booking flow. Extracted from
 * LushStudioBooking.tsx as part of Phase 7 of the booking-architecture
 * refactor (docs/booking-architecture.md).
 *
 * The full prop shape for PlatformBookingFlow lives in LushStudioBooking
 * itself — these are the *internal* state types (which step, what's
 * loaded) the flow uses to coordinate its 5-step UI.
 */

import type { AvailableSlot } from '@/lib/types'

/**
 * Sentinel used as the "category id" for the auto-generated bucket
 * that collects services without a category assignment. Real category
 * ids are always positive integers, so this string can't collide.
 */
export const UNCATEGORIZED = '__other__'

export type CategoryKey = number | typeof UNCATEGORIZED

export type Step = 1 | 2 | 3 | 4 | 5

export type SlotState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'loaded'
      slots: AvailableSlot[]
      message: string | null
      squeezeIn?: { available: boolean; fee: number } | null
    }
  | { status: 'error'; message: string }

/**
 * Phase 8 — Add-ons is its own step now. When the chosen service has
 * no linked add-ons the helpers in LushStudioBooking short-circuit it
 * so the customer jumps 1 → 3 without a dead-end click.
 */
export const STEPS: [Step, string][] = [
  [1, 'Service'],
  [2, 'Add-ons'],
  [3, 'Date & Time'],
  [4, 'Details'],
  [5, 'Confirm'],
]
