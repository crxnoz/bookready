import { TenantData } from './types'

export const mockTenant: TenantData = {
  id: 'the-fade-room',
  slug: 'the-fade-room',
  subdomain: 'the-fade-room',
  template: 'the-fade-room',
  business: {
    name: 'The Fade Room',
    tagline: 'Premium cuts. Elevated experience.',
    description:
      'A luxury barbershop and salon experience for those who demand the finest. Walk in. Walk out sharper.',
    phone: '(555) 247-8090',
    email: 'hello@thefaderoom.com',
    address: '124 W Grand Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60654',
    instagram: '@thefaderoom',
  },
  services: [
    { id: 1, name: 'Signature Fade',      description: 'Our most requested cut. A precise taper from skin to your desired length.', duration_minutes: 45, price: 55,  category: 'Cuts',      is_active: true, sort_order: 0 },
    { id: 2, name: 'Beard Line-Up',        description: 'Sharp edges, clean lines. Defined to perfection.',                           duration_minutes: 20, price: 30,  category: 'Grooming',  is_active: true, sort_order: 1 },
    { id: 3, name: 'Cut + Beard Combo',    description: 'Full service. Fade and beard sculpted together.',                             duration_minutes: 60, price: 75,  category: 'Packages',  is_active: true, sort_order: 2 },
    { id: 4, name: 'Scalp Treatment',      description: 'Deep conditioning and scalp massage for health and relaxation.',              duration_minutes: 30, price: 40,  category: 'Treatments', is_active: true, sort_order: 3 },
    { id: 5, name: 'The Full Experience',  description: 'Fade, beard, hot towel shave, and scalp treatment. The complete package.',    duration_minutes: 90, price: 110, category: 'Packages',  is_active: true, sort_order: 4 },
    { id: 6, name: 'Blow-Out & Style',     description: 'Wash, blow-dry, and style for textured or longer hair.',                     duration_minutes: 45, price: 50,  category: 'Styling',   is_active: true, sort_order: 5 },
  ],
  staff: [
    {
      id: '1',
      name: 'Marcus Cole',
      title: 'Master Barber & Founder',
      bio: '15 years behind the chair. Trained in Chicago, Atlanta, and London.',
      specialties: ['Fades', 'Beard Sculpting', 'Designs'],
    },
    {
      id: '2',
      name: 'Aaliyah James',
      title: 'Senior Stylist',
      bio: "Specialist in textured hair and creative cuts. Known for precision and artistry.",
      specialties: ['Textured Hair', 'Color', "Women's Cuts"],
    },
    {
      id: '3',
      name: 'Devon Pierce',
      title: 'Barber',
      bio: 'Two years with the Fade Room team. Fast, consistent, and always on point.',
      specialties: ['Fades', 'Line-Ups', 'Curls'],
    },
  ],
  gallery: [
    { id: '1', url: '', alt: 'Signature fade on curly hair' },
    { id: '2', url: '', alt: 'Beard sculpting close-up' },
    { id: '3', url: '', alt: "Women's textured cut" },
    { id: '4', url: '', alt: 'Shop interior' },
    { id: '5', url: '', alt: 'Skin fade detail shot' },
    { id: '6', url: '', alt: 'Full look styling' },
  ],
  hours: [
    { id: 1, day_of_week: 0, day_name: 'Sunday',    is_open: false, open_time: null,    close_time: null,    break_start: null, break_end: null },
    { id: 2, day_of_week: 1, day_name: 'Monday',    is_open: true,  open_time: '09:00', close_time: '19:00', break_start: null, break_end: null },
    { id: 3, day_of_week: 2, day_name: 'Tuesday',   is_open: true,  open_time: '09:00', close_time: '19:00', break_start: null, break_end: null },
    { id: 4, day_of_week: 3, day_name: 'Wednesday', is_open: true,  open_time: '09:00', close_time: '19:00', break_start: null, break_end: null },
    { id: 5, day_of_week: 4, day_name: 'Thursday',  is_open: true,  open_time: '09:00', close_time: '20:00', break_start: null, break_end: null },
    { id: 6, day_of_week: 5, day_name: 'Friday',    is_open: true,  open_time: '09:00', close_time: '20:00', break_start: null, break_end: null },
    { id: 7, day_of_week: 6, day_name: 'Saturday',  is_open: true,  open_time: '08:00', close_time: '18:00', break_start: null, break_end: null },
  ],
  policies: [
    {
      id: '1',
      title: 'Cancellation Policy',
      content:
        'We require 24 hours notice for cancellations. Late cancellations or no-shows may be charged 50% of the service fee. We understand life happens — please reach out as early as possible.',
    },
    {
      id: '2',
      title: 'Late Arrivals',
      content:
        'If you arrive more than 10 minutes late, we may need to adjust your service to stay on schedule. After 15 minutes, your appointment may be rescheduled and a late fee may apply.',
    },
    {
      id: '3',
      title: 'Booking & Deposits',
      content:
        'A card on file is required to hold your appointment. No charges are made until your visit. For services over $100, a 30% deposit is required at booking.',
    },
  ],
  faqs: [
    {
      id: '1',
      question: 'Do you accept walk-ins?',
      answer:
        'We primarily operate by appointment but do take walk-ins based on availability. We recommend booking ahead to guarantee your spot.',
    },
    {
      id: '2',
      question: 'What payment methods do you accept?',
      answer:
        'We accept all major credit cards, debit cards, and cash. Digital payments like Apple Pay and Google Pay are also welcome.',
    },
    {
      id: '3',
      question: 'How long should I book for my first visit?',
      answer:
        'For first-time clients we recommend the Signature Fade or a consultation. Plan for 45–60 minutes so we can get to know your preferences.',
    },
    {
      id: '4',
      question: 'Can I request a specific barber or stylist?',
      answer:
        'Yes. When booking, you can select your preferred team member. Availability varies so book early if you have a preference.',
    },
  ],
}
