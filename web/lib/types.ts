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
  category: string | null
  is_active: boolean
  sort_order: number
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

export interface BusinessPolicy {
  id?: number
  cancellation_policy: string | null
  late_policy: string | null
  no_show_policy: string | null
  deposit_policy: string | null
  reschedule_policy: string | null
  extra_notes: string | null
}

// Staff (API-backed, editor + public)
export interface ApiStaffMember {
  id: number
  name: string
  role: string | null
  bio: string | null
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
  email?: string | null
  phone?: string | null
  photo_url?: string | null
  is_active?: boolean
  sort_order?: number
}

export interface PublicStaffMember {
  id: number
  name: string
  role: string | null
  bio: string | null
  photo_url: string | null
  sort_order: number
}

// Public tenant lookup
export interface PublicSite {
  availability?: AvailabilityData | null
  tenant_id: string
  slug: string
  domain: string | null
  business_name: string | null
  plan: string
  status: string
  profile?: BusinessProfile | null
  services?: Service[]
  hours?: HoursEntry[]
  policies?: BusinessPolicy | null
  staff?: PublicStaffMember[]
  gallery?: PublicGalleryItem[]
  before_after?: PublicBeforeAfterItem[]
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
  created_at?:                          string
  updated_at?:                          string
}

export type NotificationSettingsPayload = Partial<Omit<NotificationSettings,
  'id' | 'created_at' | 'updated_at'>>

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

export interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  last_appointment_at: string | null
  appointment_count: number
  upcoming_appointment_count: number
  last_appointment: CustomerAppointmentSummary | null
  next_appointment: CustomerAppointmentSummary | null
  created_at: string
  updated_at: string
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

export interface Appointment {
  id: number
  customer_id: number | null
  service_id: number | null
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
  // Balance-charge snapshot — null until owner clicks "Charge balance".
  balance_checkout_session_id?: string | null
  balance_paid_amount?:         number | null
  balance_paid_at?:             string | null
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
}

export interface TemplateSettings {
  header: TemplateHeaderSettings
  tabs: TemplateTabLabels
  steps: TemplateInstructionBlock
  before_appointment: TemplateInstructionBlock
  footer: TemplateFooterSettings
  additionals?: TemplateAdditionalsSettings
  about?: TemplateAboutSettings
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
