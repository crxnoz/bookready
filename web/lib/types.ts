export type DayOfWeek =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'

export interface Business {
  name: string
  tagline: string
  description: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  zip: string
  instagram?: string
  logoUrl?: string
}

export interface Service {
  id: number
  name: string
  description: string | null
  price: number
  duration_minutes: number
  /** Legacy free-text category — kept for one release so older payloads
   *  still type-check. New code should use category_id + ServiceCategory. */
  category: string | null
  /** Phase 3: FK into ServiceCategory. */
  category_id?: number | null
  /** Phase 3: per-service image (UploadKind 'service'). */
  image_url?: string | null
  /** Phase 4: null = inherit the global before-buffer. Integer ≥ 0 = exact
   *  override (a 0 explicitly disables the buffer for this service). */
  buffer_before_override_minutes?: number | null
  buffer_after_override_minutes?:  number | null
  /** Phase 4: weekdays this service is offered (0=Sun..6=Sat). null = inherit
   *  business hours (every day the business is open). */
  available_days?: number[] | null
  /** Phase 4: staff that can perform this service. Empty = any staff. */
  assigned_staff_ids?: number[]
  /** Phase 5: add-ons linked to this service. Each link carries its own
   *  required/optional flag so the same add-on can be required for one
   *  service and optional for another. */
  linked_addons?: ServiceAddonLink[]
  is_active: boolean
  sort_order: number
}

// Phase 5: per-service add-on. Each is a tenant-defined extra that
// can be linked to one or more services with a per-link required flag.
export interface ServiceAddon {
  id: number
  name: string
  description: string | null
  image_url: string | null
  /** Stored as cents server-side; both fields are emitted for editor
   *  convenience. Writes accept either via `extra_price` (dollars). */
  extra_price: number
  extra_price_cents: number
  extra_duration_minutes: number
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface ServiceAddonPayload {
  name: string
  description?: string | null
  image_url?: string | null
  extra_price?: number | null              // dollars
  extra_duration_minutes?: number
  is_active?: boolean
  sort_order?: number
}

/** Per-service link to an add-on, with the per-link required flag. */
export interface ServiceAddonLink {
  addon_id: number
  is_required: boolean
}

// ── Phase 16: Booking Questions (form builder) ──────────────────────────────

export type BookingQuestionType = 'text' | 'textarea' | 'checkbox' | 'dropdown' | 'image'
export type BookingQuestionScope = 'all' | 'services'

export interface BookingQuestion {
  id: number
  label: string
  type: BookingQuestionType
  options: string[]               // for dropdown
  help_text: string | null
  required: boolean
  scope: BookingQuestionScope
  service_ids: number[]           // when scope='services'
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface BookingQuestionPayload {
  label?: string
  type?: BookingQuestionType
  options?: string[] | null
  help_text?: string | null
  required?: boolean
  scope?: BookingQuestionScope
  service_ids?: number[] | null
  is_active?: boolean
  sort_order?: number
}

/** Wire shape for an answer sent with the public booking POST. */
export interface BookingQuestionAnswerInput {
  question_id: number
  value?: string | boolean | null
  image_url?: string | null
}

/** Snapshot shape stored on appointments.question_answers + returned to owner. */
export interface BookingQuestionAnswerSnapshot {
  question_id: number
  label_snapshot: string
  type_snapshot: BookingQuestionType
  value: string | boolean | null
  image_url: string | null
}

// Phase 3: rich service category. Replaces the free-text `category`
// column with an editable resource (image, description, active flag).
export interface ServiceCategory {
  id: number
  name: string
  description: string | null
  image_url: string | null
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface ServiceCategoryPayload {
  name: string
  description?: string | null
  image_url?: string | null
  is_active?: boolean
  sort_order?: number
}

export interface StaffMember {
  id: string
  name: string
  title: string
  bio: string
  specialties: string[]
  imageUrl?: string
}

export interface GalleryImage {
  id: string
  url: string
  alt: string
}

// API-backed gallery items (editor + public)
export interface GalleryItem {
  id: number
  title: string | null
  caption: string | null
  alt_text: string | null
  image_url: string
  category: string | null
  is_active: boolean
  sort_order: number
  /** Owner-organized group bucket. null = ungrouped. */
  group_id?: number | null
  created_at?: string
  updated_at?: string
}

export interface GalleryItemPayload {
  title?: string | null
  caption?: string | null
  alt_text?: string | null
  image_url: string
  category?: string | null
  is_active?: boolean
  sort_order?: number
  group_id?: number | null
}

// Public-facing subset
export interface PublicGalleryItem {
  id: number
  title: string | null
  caption: string | null
  alt_text: string | null
  image_url: string
  category: string | null
  sort_order: number
  group_id?: number | null
}

// Gallery groups (max 3 per tenant)
export interface GalleryGroup {
  id: number
  heading: string
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface GalleryGroupPayload {
  heading: string
  sort_order?: number
}

// API-backed before/after pairs (editor + public)
export interface BeforeAfterItem {
  id: number
  title: string | null
  caption: string | null
  before_image_url: string
  after_image_url: string
  before_alt_text: string | null
  after_alt_text: string | null
  category: string | null
  is_active: boolean
  sort_order: number
  /** Owner-organized group bucket. null = ungrouped. */
  group_id?: number | null
  created_at?: string
  updated_at?: string
}

export interface BeforeAfterItemPayload {
  title?: string | null
  caption?: string | null
  before_image_url: string
  after_image_url: string
  before_alt_text?: string | null
  after_alt_text?: string | null
  category?: string | null
  is_active?: boolean
  sort_order?: number
  group_id?: number | null
}

export interface PublicBeforeAfterItem {
  id: number
  title: string | null
  caption: string | null
  before_image_url: string
  after_image_url: string
  before_alt_text: string | null
  after_alt_text: string | null
  category: string | null
  sort_order: number
  group_id?: number | null
}

// Before/After groups (max 3 per tenant)
export interface BeforeAfterGroup {
  id: number
  heading: string
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface BeforeAfterGroupPayload {
  heading: string
  sort_order?: number
}

export interface HoursEntry {
  id: number
  day_of_week: number
  day_name: string
  is_open: boolean
  open_time: string | null
  close_time: string | null
  break_start: string | null
  break_end: string | null
}

export interface Policy {
  id: string
  title: string
  content: string  // maps to 'content' column in tenant DB
}

export interface FAQ {
  id: string
  question: string
  answer: string
}

export interface TenantData {
  id: string
  slug: string
  subdomain: string
  template: 'the-fade-room'
  business: Business
  services: Service[]
  staff: StaffMember[]
  gallery: GalleryImage[]
  hours: HoursEntry[]
  policies: Policy[]
  faqs: FAQ[]
}

// Billing / Stripe checkout
export type BillingCycle = 'monthly' | 'quarterly' | 'annual'

export interface CheckoutPayload {
  billing_cycle: BillingCycle
  template_slug: string
}

export interface CheckoutResponse {
  checkout_url: string
}

export interface CheckoutSessionData {
  id: string
  status: string
  payment_status: string
  customer: string | null
  subscription: string | null
}

// Business profile (editor + public)
export interface BusinessProfile {
  id?: number
  business_name: string | null
  tagline: string | null
  business_type: string | null
  public_email: string | null
  public_phone: string | null
  address_line: string | null
  city: string | null
  state: string | null
  zip: string | null
  instagram_url: string | null
  booking_enabled: boolean
  site_status: string
  // ── Preferences (migration #5 — owner-facing behavior settings) ──
  time_zone?: string | null
  /** 0=Sunday, 1=Monday */
  week_start_day?: number
  time_format?: '12h' | '24h'
  default_appointment_duration_minutes?: number
  post_booking_message?: string | null
  email_signature?: string | null
  site_visibility?: 'public' | 'private' | 'coming_soon'
  /** Read-only signal. Set site_password on PATCH; backend hashes. */
  site_password_set?: boolean
  /** Write-only. Empty string clears. */
  site_password?: string
}

/**
 * Shape returned by GET /api/v1/editor/availability — owned by the
 * Availability editor. Different from {@link BookingSettings} below,
 * which is the simplified business-rules shape exposed under
 * /api/v1/editor/settings/bookings.
 */
export interface AvailabilitySettings {
  id?: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  minimum_notice_minutes: number
  booking_interval_minutes: number
  max_days_ahead: number
  max_appointments_per_day: number | null
  auto_confirm_bookings: boolean
  slot_release_enabled: boolean
  slot_release_frequency: 'weekly' | 'biweekly' | 'monthly' | 'custom' | null
  slot_release_day_of_week: number | null
  slot_release_day_of_month: number | null
  slot_release_time: string | null
  slot_release_window_days: number | null
}

export interface AvailabilityData {
  hours: HoursEntry[]
  settings: AvailabilitySettings
}

export interface PolicyCustomItem {
  title:   string
  content: string
}

export interface PolicyCustomGroup {
  heading: string
  items:   PolicyCustomItem[]
}

export interface BusinessPolicy {
  id?: number
  cancellation_policy: string | null
  late_policy: string | null
  no_show_policy: string | null
  deposit_policy: string | null
  reschedule_policy: string | null
  extra_notes: string | null
  // ── Enforcement rules (migration #5) ──
  /** Minutes past start. 0 = disabled. Cron enforcement coming soon. */
  late_grace_period_minutes?: number
  forfeit_deposit_on_late_cancel?: boolean
  /** null = unlimited, 0 = no reschedules allowed */
  max_reschedules_per_booking?: number | null
  require_policy_agreement?: boolean
  /** Owner-defined extra policy sections — rendered after the 6 named ones. */
  custom_groups?: PolicyCustomGroup[]
}

// Staff (API-backed, editor + public)
export interface ApiStaffMember {
  id: number
  name: string
  role: string | null
  bio: string | null
  /** Required as of Phase 2 — legacy rows pre-backfill may still surface a
   *  placeholder `staff-{id}@placeholder.local` value here. */
  email: string | null
  phone: string | null
  photo_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface StaffMemberPayload {
  name: string
  role?: string | null
  bio?: string | null
  /** Required on create — kept optional on the payload type so the same
   *  shape works for partial PATCH updates. The API rejects empty values. */
  email?: string
  phone?: string | null
  photo_url?: string | null
  is_active?: boolean
  sort_order?: number
}

// Phase 2: per-staff working hours. Same shape as HoursEntry minus the
// global `is_closed`/`is_open` naming inversion — staff_hours uses the
// positive form directly.
export interface StaffHoursEntry {
  id: number
  day_of_week: number
  day_name: string
  is_open: boolean
  open_time: string | null
  close_time: string | null
  break_start: string | null
  break_end: string | null
}

// Phase 6: a tenant-wide blocked-date range (holiday, full closure).
// Per-staff blocks live in StaffBlockedDate.
export interface BlockedDate {
  id: number
  start_date: string
  end_date: string | null
  reason: string | null
  created_at?: string
  updated_at?: string
}

export interface BlockedDatePayload {
  start_date: string
  end_date?: string | null
  reason?: string | null
}

// Phase 2: a single staff blocked-date range. end_date null = single day.
export interface StaffBlockedDate {
  id: number
  staff_id: number
  start_date: string
  end_date: string | null
  reason: string | null
  created_at?: string
  updated_at?: string
}

export interface StaffBlockedDatePayload {
  start_date: string
  end_date?: string | null
  reason?: string | null
}

export interface PublicStaffMember {
  id: number
  name: string
  role: string | null
  bio: string | null
  photo_url: string | null
  sort_order: number
  /** Phase 2: per-staff hours + blocked dates. Always present (may be
   *  empty arrays) on tenants that have run the Phase 2 migrations. */
  hours?:         StaffHoursEntry[]
  blocked_dates?: StaffBlockedDate[]
}

// Public tenant lookup
export interface PublicSite {
  availability?: AvailabilityData | null
  // Phase S1: 'locked' or 'coming_soon' when the owner has restricted
  // public access. Most callers should only render the full template
  // when status === 'active'.
  tenant_id?: string
  slug: string
  domain?: string | null
  business_name?: string | null
  plan?: string
  status: string
  // Set when status === 'locked' — tells the lock screen whether to
  // show a password prompt.
  has_password?: boolean
  profile?: BusinessProfile | null
  services?: Service[]
  service_categories?: ServiceCategory[]
  service_addons?: ServiceAddon[]
  booking_questions?: BookingQuestion[]
  blocked_dates?: BlockedDate[]
  hours?: HoursEntry[]
  policies?: BusinessPolicy | null
  staff?: PublicStaffMember[]
  gallery?: PublicGalleryItem[]
  gallery_groups?: GalleryGroup[]
  before_after?: PublicBeforeAfterItem[]
  before_after_groups?: BeforeAfterGroup[]
  template?: PublicTemplate | null
  payment_settings?: PublicPaymentSettings | null
  booking_settings?: PublicBookingSettings | null
}

// ── Payment settings ─────────────────────────────────────────────────────────

export type DepositType = 'flat' | 'percent'

export type StripeConnectStatus =
  | 'not_connected'
  | 'onboarding_started'
  | 'pending'
  | 'active'
  | 'restricted'

export interface PaymentSettings {
  id?: number
  payments_enabled:    boolean
  deposits_enabled:    boolean
  deposit_type:        DepositType | null
  deposit_amount:      number | null
  allow_full_payment:  boolean
  // Add-ons
  allow_split_pay?:           boolean
  collect_tax?:               boolean
  save_cards_for_reuse?:      boolean
  no_show_fee_amount?:        number | null
  late_cancel_fee_amount?:    number | null
  late_cancel_window_hours?:  number
  currency:            string
  created_at?:         string
  updated_at?:         string

  // ── Stripe Connect (read-only on the payments PATCH endpoint;
  //    managed by the /editor/settings/payments/connect/* routes) ──
  stripe_connect_account_id?:              string | null
  stripe_connect_status?:                  StripeConnectStatus
  stripe_charges_enabled?:                 boolean
  stripe_payouts_enabled?:                 boolean
  stripe_details_submitted?:               boolean
  stripe_connect_onboarding_completed_at?: string | null
  stripe_connect_last_checked_at?:         string | null
}

export type PaymentSettingsPayload = Partial<Omit<PaymentSettings,
  | 'id' | 'created_at' | 'updated_at'
  | 'stripe_connect_account_id'
  | 'stripe_connect_status'
  | 'stripe_charges_enabled'
  | 'stripe_payouts_enabled'
  | 'stripe_details_submitted'
  | 'stripe_connect_onboarding_completed_at'
  | 'stripe_connect_last_checked_at'
>>

export interface StripeConnectStatusResponse {
  stripe_connect_account_id:              string | null
  stripe_connect_status:                  StripeConnectStatus
  stripe_charges_enabled:                 boolean
  stripe_payouts_enabled:                 boolean
  stripe_details_submitted:               boolean
  stripe_connect_onboarding_completed_at?: string | null
  stripe_connect_last_checked_at?:        string | null
}

export interface StripeConnectStartResponse {
  onboarding_url:            string
  stripe_connect_account_id: string
}

// ── Platform admin (super-admin only) ───────────────────────────────────────

export interface AdminTenantRow {
  id:            string
  plan:          string | null
  created_at:    string | null
  updated_at:    string | null
  domain:        string | null
  owner_id:      number | null
  owner_name:    string | null
  owner_email:   string | null
  stripe_id:     string | null
  trial_ends_at: string | null
}

export interface AdminTenantsResponse {
  tenants: AdminTenantRow[]
  count:   number
}

// ── Platform announcements (central, admin-editable) ────────────────────────

export interface PlatformAnnouncement {
  id:           number
  title:        string
  body:         string
  cta_label:    string | null
  cta_href:     string | null
  is_active:    boolean
  sort_order:   number
  published_at: string | null
  created_at?:  string
  updated_at?:  string
}

export interface PlatformAnnouncementPayload {
  title?:        string
  body?:         string
  cta_label?:    string | null
  cta_href?:     string | null
  is_active?:    boolean
  sort_order?:   number
  published_at?: string | null
}

// ── Account (owner profile + password + sessions) ───────────────────────────

export interface AccountProfile {
  id:          number
  name:        string
  email:       string
  is_owner:    boolean
  tenant_id:   string
  created_at?: string
  updated_at?: string
}

export interface AccountUpdatePayload {
  name?:  string
  email?: string
}

export interface ChangePasswordPayload {
  current_password:           string
  new_password:               string
  new_password_confirmation:  string
}

export interface SignOutEverywhereResponse {
  message:       string
  revoked_count: number
}

// ── Manage booking (public, token-gated) ────────────────────────────────────

export interface ManageBookingView {
  id:                          number
  customer_name:               string
  customer_email:              string | null
  service_id:                  number | null
  service_name:                string
  service_duration_minutes:    number | null
  service_price:               number | null
  appointment_date:            string   // "YYYY-MM-DD"
  start_time:                  string   // "HH:MM"
  end_time:                    string   // "HH:MM"
  status:                      string
  is_terminal:                 boolean
  hours_until_appointment:     number
  can_cancel:                  boolean
  can_reschedule:              boolean
  cancellation_window_hours:   number
  reschedule_window_hours:     number
}

export interface ManageBookingActionResponse {
  message:     string
  status?:     string
  appointment?: ManageBookingView
}

// ── Notification settings ───────────────────────────────────────────────────

export interface NotificationSettings {
  id?:                                  number
  owner_booking_email_enabled:          boolean
  client_booking_email_enabled:         boolean
  appointment_confirmed_email_enabled:  boolean
  appointment_cancelled_email_enabled:  boolean
  reminder_email_enabled:               boolean
  reminder_hours_before:                number
  reply_to_email:                       string | null
  sender_name:                          string | null
  /** Phase 17 — per-template subject/intro/signoff overrides. Keyed by
   *  template id (see EMAIL_TEMPLATE_KEYS below). */
  email_templates?:                     Partial<Record<EmailTemplateKey, EmailTemplateOverride>>
  /** Read-only — derived server-side from mail.from + sender_name. */
  effective_from_address?:              string
  effective_from_name?:                 string
  created_at?:                          string
  updated_at?:                          string
}

export type EmailTemplateKey =
  | 'booking_request_client'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'appointment_reminder'

export interface EmailTemplateOverride {
  subject?: string | null
  intro?:   string | null
  signoff?: string | null
}

export const EMAIL_TEMPLATE_KEYS: EmailTemplateKey[] = [
  'booking_request_client',
  'appointment_confirmed',
  'appointment_cancelled',
  'appointment_rescheduled',
  'appointment_reminder',
]

export type NotificationSettingsPayload = Partial<Omit<NotificationSettings,
  'id' | 'created_at' | 'updated_at' | 'effective_from_address' | 'effective_from_name'>>

// ── Booking settings ────────────────────────────────────────────────────────

export type SlotReleaseMode = 'always_open' | 'weekly' | 'biweekly' | 'monthly'

export interface BookingSettings {
  id?:                                 number
  booking_enabled:                     boolean
  auto_confirm_bookings:               boolean
  minimum_notice_minutes:              number
  max_days_ahead:                      number
  slot_interval_minutes:               number
  slot_release_mode:                   SlotReleaseMode
  slot_release_window_days:            number | null
  cancellation_window_hours:           number
  reschedule_window_hours:             number
  prevent_duplicate_client_bookings:   boolean
  created_at?:                         string
  updated_at?:                         string
}

export type BookingSettingsPayload = Partial<Omit<BookingSettings, 'id' | 'created_at' | 'updated_at'>>

export interface PublicBookingSettings {
  booking_enabled:                     boolean
  auto_confirm_bookings:               boolean
  minimum_notice_minutes:              number
  max_days_ahead:                      number
  slot_interval_minutes:               number
  slot_release_mode:                   SlotReleaseMode
  slot_release_window_days:            number | null
  cancellation_window_hours:           number
  reschedule_window_hours:             number
  prevent_duplicate_client_bookings:   boolean
}

export interface PublicPaymentSettings {
  payments_enabled:    boolean
  deposits_enabled:    boolean
  deposit_type:        DepositType | null
  deposit_amount:      number | null
  allow_full_payment:  boolean
  allow_split_pay?:    boolean
  collect_tax?:        boolean
  late_cancel_fee_amount?:    number | null
  late_cancel_window_hours?:  number
  currency:            string
}

// Appointments & Customers
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

export interface CustomerAppointmentSummary {
  date: string
  service_name: string
  status: string
  start_time?: string
}

/** Phase 13 — server-decided CRM status. VIP is the only manual one
 *  (clients.is_vip); everything else is derived from appointment
 *  history in CustomersController::deriveStatus. */
export type CustomerStatus = 'new' | 'returning' | 'regular' | 'vip' | 'inactive'

/** Phase 14 — tenant-defined tag managed via /editor/customer-tags. */
export interface CustomerTag {
  id: number
  name: string
  /** 7-char hex (#RRGGBB) or null for default chip styling. */
  color: string | null
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface CustomerTagPayload {
  name:        string
  color?:      string | null
  sort_order?: number
}

/** Phase 14 — preferred-this preferred-that. All nullable; the
 *  preferences block is always present on Customer (with nulls)
 *  so the frontend doesn't have to feature-detect each field. */
export interface CustomerPreferences {
  preferred_service_id:     number | null
  preferred_staff_id:       number | null
  preferred_time_of_day:    'morning' | 'afternoon' | 'evening' | null
  preferred_contact_method: 'email'   | 'sms'       | 'phone'   | null
  /** YYYY-MM-DD. */
  birthday:                 string | null
  preferences_notes:        string | null
}

export interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  /** Phase 13 — manual override that supersedes the auto status. */
  is_vip: boolean
  /** Phase 13 — auto-derived (or 'vip' when is_vip is true). */
  status: CustomerStatus
  /** Phase 14 — true when 2+ no_show in last 5 visits OR >=30% rate
   *  across at least 3 attendable visits. Drives the No-Show Risk
   *  segment chip + a warning chip on the customer row. */
  no_show_risk: boolean
  /** Phase 14 — tag chips assigned to this customer. */
  tags: CustomerTag[]
  /** Phase 14 — structured preferences (all nullable). */
  preferences: CustomerPreferences
  last_appointment_at: string | null
  appointment_count: number
  upcoming_appointment_count: number
  completed_count: number
  last_appointment: CustomerAppointmentSummary | null
  next_appointment: CustomerAppointmentSummary | null
  /** Phase 13 — payment rollups across this customer's appointments.
   *  total_spent = deposits + balances + tips - refunds.
   *  outstanding_balance = sum of amount_due where balance still owed. */
  total_spent: number
  deposits_paid: number
  outstanding_balance: number
  last_payment_status: string | null
  created_at: string
  updated_at: string
}

/** Phase 13 — single appointment row inside the customer detail timeline. */
export interface CustomerAppointmentRow {
  id: number
  appointment_date: string
  start_time: string
  end_time: string | null
  service_name: string
  service_price: number | null
  status: string
  payment_status: string | null
  deposit_paid_amount: number | null
  balance_paid_amount: number | null
  amount_due: number | null
  tip_amount: number | null
  refunded_amount: number | null
}

/** Phase 13 — GET /editor/customers/{id} returns a Customer with the
 *  full appointment history attached. */
export interface CustomerDetail extends Customer {
  appointments: CustomerAppointmentRow[]
}

export interface CustomerCreatePayload {
  name: string
  email?: string
  phone?: string
  notes?: string
}

export interface CustomerUpdatePayload {
  name: string
  email?: string | null
  phone?: string | null
  notes?: string | null
  // Phase 14 — preferences are optional in PATCH so the drawer can
  // save just one section at a time. Presence of `tag_ids` replaces
  // the pivot atomically; omission leaves it alone.
  preferred_service_id?:     number | null
  preferred_staff_id?:       number | null
  preferred_time_of_day?:    'morning' | 'afternoon' | 'evening' | null
  preferred_contact_method?: 'email'   | 'sms'       | 'phone'   | null
  birthday?:                 string | null
  preferences_notes?:        string | null
  tag_ids?:                  number[]
}

export type PaymentStatus =
  | 'none' | 'pending_payment' | 'deposit_paid' | 'paid' | 'failed'
  | 'refunded' | 'partially_refunded'

// Mirrors Stripe's dispute.status enum. null when no dispute exists.
export type DisputeStatus =
  | 'warning_needs_response' | 'warning_under_review' | 'warning_closed'
  | 'needs_response' | 'under_review'
  | 'won' | 'lost'
  | 'charge_refunded'

/** Phase 7: snapshot of an add-on attached to an appointment.
 *  Price + duration are frozen at booking time so future catalog edits
 *  don't rewrite this appointment's totals. */
export interface AppointmentAddon {
  addon_id: number
  name: string
  extra_price: number
  extra_price_cents: number
  extra_duration_minutes: number
}

export interface Appointment {
  id: number
  customer_id: number | null
  service_id: number | null
  /** Phase 7: optional staff assignment + add-on snapshot. */
  staff_id?: number | null
  staff_name?: string | null
  addons?: AppointmentAddon[]
  addons_subtotal?: number
  /** Phase 16 — custom booking-question answers (JSON snapshot). */
  question_answers?: BookingQuestionAnswerSnapshot[]
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  service_name: string
  service_price: number | null
  service_duration_minutes: number | null
  appointment_date: string   // "YYYY-MM-DD"
  start_time: string         // "HH:MM"
  end_time: string           // "HH:MM"
  status: AppointmentStatus
  notes: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
  // Payment snapshot — nullable / 'none' for old appointments created
  // before the payment columns existed.
  /** Phase 15 — human-friendly receipt # (R-000001). Set on the first
   *  successful payment; null until then. */
  receipt_number?:       string | null
  payment_status?:       PaymentStatus
  deposit_required?:     boolean
  deposit_amount?:       number | null
  deposit_paid_amount?:  number | null
  amount_due?:           number | null
  currency?:             string
  paid_at?:              string | null
  // Manual payment metadata — null when paid via Stripe.
  payment_method?:       'cash' | 'venmo' | 'zelle' | 'other' | null
  payment_note?:         string | null
  // Presence signals "refund button works" — Stripe payments only.
  stripe_payment_intent_id?: string | null
  // Set when a Stripe Checkout session has been initiated for this row
  // (either at public booking time or via "Send payment link" for an
  // unpaid appointment). Used to drive "Resend link" UI labeling.
  stripe_checkout_session_id?: string | null
  // Balance-charge snapshot — null until owner clicks "Charge balance".
  balance_checkout_session_id?: string | null
  balance_paid_amount?:         number | null
  balance_paid_at?:             string | null
  // Tip snapshot — null when no tip received yet
  tip_amount?:        number | null
  tip_paid_at?:       string | null
  // Saved card (presence = late fees available)
  stripe_customer_id?:       string | null
  saved_payment_method_id?:  string | null
  // Late fee snapshot
  late_fee_amount?:   number | null
  late_fee_type?:     'no_show' | 'late_cancel' | null
  late_fee_paid_at?:  string | null
  // Refund snapshot — null when nothing has been refunded yet.
  refunded_amount?:      number | null
  refunded_at?:          string | null
  // Dispute snapshot — null when no active or historical dispute.
  dispute_status?:       DisputeStatus | null
  dispute_reason?:       string | null
  dispute_amount?:       number | null
  dispute_opened_at?:    string | null
  dispute_closed_at?:    string | null
}

export interface RefundPayload {
  /** Omit or null for full refund of remaining balance. */
  amount?: number | null
  /** Maps to Stripe refund reason. Free-text is ignored by backend. */
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | null
}

export interface RefundResponse {
  message: string
  appointment: Appointment
}

export interface MarkPaidPayload {
  amount: number
  method: 'cash' | 'venmo' | 'zelle' | 'other'
  note?: string
}

export interface MarkPaidResponse {
  message: string
  appointment: Appointment
}

export interface ConnectDashboardLinkResponse {
  url: string
}

export interface ChargeBalanceResponse {
  message: string
  email_sent: boolean
  checkout_url: string
  appointment: Appointment
}

export interface RequestTipResponse {
  message: string
  email_sent: boolean
  tip_url: string
}

export interface ChargeLateFeePayload {
  type: 'no_show' | 'late_cancel'
  amount?: number | null
}

export interface ChargeLateFeeResponse {
  message: string
  appointment: Appointment
}

export interface CreateAppointmentPayload {
  customer_name: string
  customer_email?: string
  customer_phone?: string
  service_id: number
  appointment_date: string
  start_time: string
  notes?: string
  internal_notes?: string
  status?: AppointmentStatus
  /** Phase 7: optional staff assignment + add-on list. The backend
   *  whitelists addon_ids against the service's links and auto-adds
   *  any required ones the client missed. */
  staff_id?: number | null
  addon_ids?: number[]
}

export interface UpdateAppointmentPayload {
  customer_name?: string
  customer_email?: string | null
  customer_phone?: string | null
  service_id?: number
  appointment_date?: string
  start_time?: string
  status?: AppointmentStatus
  notes?: string | null
  internal_notes?: string | null
  /** Phase 7: presence replaces the pivot atomically (omission leaves
   *  the current set alone). */
  staff_id?: number | null
  addon_ids?: number[]
}

// Public availability
export interface AvailableSlot {
  start_time: string   // "HH:MM"
  end_time: string     // "HH:MM"
  label: string        // "10:00 AM"
}

export interface PublicAvailabilityResponse {
  date: string
  service: {
    id: number
    name: string
    duration_minutes: number
    price: number
  }
  slots: AvailableSlot[]
  message: string | null
}

// Public booking
export type PaymentChoice = 'deposit' | 'full'

export interface PublicBookingPayload {
  service_id: number
  appointment_date: string   // "YYYY-MM-DD"
  start_time: string         // "HH:MM"
  customer_name: string
  customer_email?: string
  customer_phone?: string
  notes?: string
  payment_choice?: PaymentChoice
  /** Required when the tenant has require_policy_agreement turned on. */
  policy_agreed?: boolean
  /** Phase 7: optional staff assignment + add-on list. Backend whitelists
   *  addon_ids against the service's links and auto-includes any required
   *  ones the client missed. Empty/missing staff_id = "any staff". */
  staff_id?: number | null
  addon_ids?: number[]
  /** Phase 16: custom booking-question answers. Backend snapshots into
   *  appointments.question_answers; required ones are enforced server-side. */
  question_answers?: BookingQuestionAnswerInput[]
}

export interface PublicBookingResponse {
  message: string
  appointment: {
    id: number
    service_name: string
    appointment_date: string
    start_time: string
    end_time: string
    status: string
    customer_name: string
  }
  // Present when the tenant requires a payment and a Stripe Checkout
  // session was created — frontend should redirect to checkout_url.
  payment_required?: boolean
  payment_type?:     PaymentChoice
  amount?:           number
  /** @deprecated — use `amount`. Kept for back-compat with older frontends. */
  deposit_amount?:   number
  currency?:         string
  checkout_url?:     string
}

// Auth
export interface AuthUser {
  id: number
  name: string
  email: string
  tenant_id: string
  is_owner: boolean
  is_admin?: boolean
  // Phase S6 part 2 — ISO 8601 string when the user has verified, or
  // null/undefined for unverified accounts. Drives the dashboard nag.
  email_verified_at?: string | null
}

export interface RegisterPayload {
  owner_name: string
  email: string
  password: string
  password_confirmation: string
  business_name: string
  template?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  tenant_id?: string  // present on register, absent on login (use user.tenant_id instead)
  domain?: string
  user: AuthUser
}

// ── Website / Template system ────────────────────────────────────────────────

export interface TemplateHeaderSettings {
  /** @deprecated tagline now lives on the business profile */
  tagline?: string
  show_book_button: boolean
  show_call_button: boolean
  show_email_button: boolean
  show_instagram_button: boolean
  show_directions_button: boolean
  show_pinterest_button?: boolean
  show_youtube_button?: boolean
  show_whatsapp_button?: boolean
  show_tiktok_button?: boolean
  show_facebook_button?: boolean
  show_message_button?: boolean
  // Per-button URL overrides — when null/empty, fall back to business profile or scroll target.
  book_button_url?: string | null
  call_button_url?: string | null
  email_button_url?: string | null
  instagram_button_url?: string | null
  directions_button_url?: string | null
  pinterest_button_url?: string | null
  youtube_button_url?: string | null
  whatsapp_button_url?: string | null
  tiktok_button_url?: string | null
  facebook_button_url?: string | null
  message_button_url?: string | null
  announcement_text?: string | null
  show_announcement?: boolean
  cover_image_url?: string | null
  avatar_image_url?: string | null
}

export interface TemplateTabLabels {
  book_label: string
  gallery_label: string
  policy_label: string
  about_label: string
  results_label: string
  steps_label: string
  before_appointment_label: string
}

export interface TemplateInstructionItem {
  title: string
  body: string
}

export interface TemplateInstructionBlock {
  heading: string
  /** Shared kicker rendered above every card's title in this block
   *  (e.g. "Aftercare advice", "How to prep"). Empty/missing = no kicker.
   *  Replaces the old auto-generated "Step 01/02/03" labels. */
  card_kicker?: string
  items: TemplateInstructionItem[]
}

export interface TemplateAboutHighlight {
  title: string
  body:  string
}

export interface TemplateAboutSettings {
  heading?:    string
  eyebrow?:    string
  body?:       string
  highlights?: TemplateAboutHighlight[]
  /** Three image URLs (or null) shown above the heading. Order: left, center, right. */
  images?:     (string | null)[]
}

export interface TemplateFaqItem {
  question: string
  answer:   string
}

export interface TemplateFaqSettings {
  enabled?: boolean
  heading?: string
  items?:   TemplateFaqItem[]
}

export interface TemplateReviewItem {
  author:  string
  body:    string
  location?: string | null
  rating?:   number | null  // 1..5
}

export interface TemplateReviewsSettings {
  enabled?: boolean
  heading?: string
  items?:   TemplateReviewItem[]
}

export interface TemplateFooterSettings {
  show_powered_by: boolean
  business_name_override?: string | null
  subtext?: string | null
  show_hours?: boolean
  show_quick_book?: boolean
  show_contact_links?: boolean
}

export interface TemplateAdditionalsSettings {
  show_thank_you?: boolean
  thank_you_title?: string | null
  thank_you_body?: string | null
  /** Single-word signature shown between the two thin lines at the bottom of
   * the thank-you section. Empty/null falls back to the auto-computed first
   * meaningful word of the business name. */
  thank_you_signature?: string | null
  faq?:     TemplateFaqSettings
  reviews?: TemplateReviewsSettings
}

export interface TemplateThemeSettings {
  /** One of the preset accent hexes (#FF3DBE, #F9FAFB, #22F5A3, #FF3B5C,
   *  #FFD84D, #3DA9FC). Null/unknown → template default. */
  accent_color?: string | null
}

export interface TemplateSettings {
  header: TemplateHeaderSettings
  tabs: TemplateTabLabels
  steps: TemplateInstructionBlock
  before_appointment: TemplateInstructionBlock
  footer: TemplateFooterSettings
  additionals?: TemplateAdditionalsSettings
  about?: TemplateAboutSettings
  theme?: TemplateThemeSettings
}

export interface TemplateSettingsResponse {
  template_slug: string
  settings: TemplateSettings
}

export type WebsiteSectionType =
  | 'header'
  | 'booking'
  | 'gallery'
  | 'policy'
  | 'about'
  | 'before_after'
  | 'instructions'
  | 'staff'
  | 'hours'
  | 'contact'
  | 'footer'
  | 'text_block'
  | 'announcement'

export interface WebsiteSection {
  id: number
  template_slug: string
  section_key: string
  section_type: WebsiteSectionType
  title: string | null
  subtitle: string | null
  content_json: Record<string, unknown> | null
  is_enabled: boolean
  is_locked: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface WebsiteSectionCreatePayload {
  section_type: 'text_block' | 'instructions' | 'announcement'
  title?: string | null
  subtitle?: string | null
  content_json?: Record<string, unknown> | null
  is_enabled?: boolean
  sort_order?: number
}

export interface WebsiteSectionUpdatePayload {
  title?: string | null
  subtitle?: string | null
  content_json?: Record<string, unknown> | null
  is_enabled?: boolean
  sort_order?: number
}

export interface PublicTemplate {
  slug: string
  settings: TemplateSettings
  sections: WebsiteSection[]
}

// ── Phase 15: Payments ledger + Stripe payouts ──────────────────────────────

/** One row in the Transactions tab. Backed by an appointment that has
 *  had payment activity; not a separate table. */
export interface PaymentTransaction {
  appointment_id:   number
  receipt_number:   string | null
  customer_name:    string
  customer_email:   string | null
  customer_id:      number | null
  service_name:     string
  appointment_date: string
  start_time:       string
  payment_status:   string
  paid_amount:      number
  tip_amount:       number | null
  refunded_amount:  number | null
  amount_due:       number | null
  currency:         string
  paid_at:          string | null
  payment_method:   'cash' | 'venmo' | 'zelle' | 'other' | null
  dispute_status:   string | null
  is_stripe:        boolean
}

export interface PaymentTransactionsResponse {
  transactions: PaymentTransaction[]
  count:        number
}

/** Stripe payout row (proxied from the Connect account; not persisted). */
export interface StripePayout {
  id:               string
  amount:           number
  currency:         string
  /** paid | pending | in_transit | canceled | failed */
  status:           string
  /** standard | instant */
  method:           string | null
  /** Unix timestamps from Stripe. Renderable with new Date(n * 1000). */
  created_at:       number
  arrival_date:     number
  description:      string | null
  failure_code:     string | null
  failure_message:  string | null
}

export interface StripePayoutsResponse {
  payouts:        StripePayout[]
  /** not_connected | onboarding_started | pending | active | restricted | error */
  connect_status: string
  count:          number
  message?:       string
}
