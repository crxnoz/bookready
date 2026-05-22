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

export interface BookingSettings {
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
  settings: BookingSettings
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
export interface PublicBookingPayload {
  service_id: number
  appointment_date: string   // "YYYY-MM-DD"
  start_time: string         // "HH:MM"
  customer_name: string
  customer_email?: string
  customer_phone?: string
  notes?: string
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
}

// Auth
export interface AuthUser {
  id: number
  name: string
  email: string
  tenant_id: string
  is_owner: boolean
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
