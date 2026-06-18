export const TIME_SLOTS = [
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
] as const

export type TimeSlot = (typeof TIME_SLOTS)[number]

export const STATUSES = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
] as const

export type BookingStatus = (typeof STATUSES)[number]

/** A unit available for / referenced by bookings (GET/POST /api/units). */
export interface Unit {
  id: string
  unitNumber: string
  type?: string
  owner?: string
  /** True if a booking already exists for this unit. */
  booked?: boolean
}

/** Mirrors the fields of the HPD Triple Play JotForm. */
export interface Booking {
  id: string
  unitNumber: string
  firstName: string
  lastName: string
  mobile: string
  /** URL to the uploaded "HPD Receipt" image, or null if none attached. */
  receiptUrl: string | null
  /** ISO date (YYYY-MM-DD) of the requested installation. */
  installationDate: string
  timeSlot: TimeSlot
  termsAccepted: boolean
  status: BookingStatus
  /** ISO datetime the form was submitted. */
  submittedAt: string
}
