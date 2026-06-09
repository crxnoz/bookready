/**
 * Pure date / time helpers used by the booking calendar + slot picker.
 * Extracted from LushStudioBooking.tsx as part of Phase 7 of the
 * booking-architecture refactor (docs/booking-architecture.md).
 *
 * Phase 7 is intentionally limited to safe, stateless extractions —
 * pure functions and pure constants. The per-step component split
 * (services / add-ons / date+time / details / confirm) is deferred
 * until Phase 6's smoke tests are running so regressions on a
 * money-handling component are caught.
 */

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Format a Date as "YYYY-MM-DD" using local time components. */
export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

/** Format a HH:MM 24-hour time as a 12-hour string with AM/PM. */
export function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

/**
 * Format an ISO date (YYYY-MM-DD) as "Mon, Jun 9". Forces local-midnight
 * interpretation so the weekday matches the customer's calendar instead
 * of UTC.
 */
export function fmtDateDisplay(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}
