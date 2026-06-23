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
]

// Slots are admin-configurable now, so this is a free string. TIME_SLOTS above
// is just the default list used as a fallback for charts / sorting.
export type TimeSlot = string

export const STATUSES = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
] as const

export type BookingStatus = (typeof STATUSES)[number]

export const ROLES = ['super_admin', 'manager', 'viewer'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  viewer: 'Viewer',
}

/** A dashboard account. */
export interface AppUser {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
}

/** A day on which installations are not available (admin-declared holiday). */
/** Admin-configured working schedule (singleton) — drives the booking calendar. */
export type ScheduleMode = 'global' | 'perDay'

export interface DaySchedule {
  open: boolean
  slots: string[]
}

export interface Schedule {
  mode: ScheduleMode
  globalSlots: string[]
  /** 7 entries indexed by weekday (0 = Sunday … 6 = Saturday). */
  days: DaySchedule[]
}

/** An activity-log entry (who did what, when). */
export interface ActivityLog {
  id: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  action: string
  description: string
  createdAt: string
}

/** One audit row from the postpones table — a single reschedule. */
export interface Postpone {
  id: string
  bookingId: string
  unitCode: string
  /** ISO date (YYYY-MM-DD) the booking was moved from / to. */
  fromDate: string
  fromTime: string
  toDate: string
  toTime: string
  /** Which postpone this was for the booking (1 = first move). */
  sequence: number
  actorName: string | null
  actorEmail: string | null
  createdAt: string
}

/** One audit row from the block_events table — a block or unblock action. */
export interface BlockEvent {
  id: string
  mobile: string
  customerName: string | null
  /** Resulting state: true = blocked, false = unblocked. */
  blocked: boolean
  actorName: string | null
  actorEmail: string | null
  createdAt: string
}

/** One thing the operator should know about a row during a restore. */
export interface RestoreNote {
  ref: string
  reason: string
}

/** Outcome of restoring one entity (units or bookings). */
export interface RestoreEntityResult {
  created: number
  skipped: number
  failed: number
  errors: RestoreNote[]
  warnings: RestoreNote[]
}

/** Result of POST /api/backup/restore. */
export interface RestoreResult {
  units: RestoreEntityResult
  bookings: RestoreEntityResult
}

/** A unit is classified as either commercial or residential. */
export type UnitType = 'commercial' | 'residential'

export const UNIT_TYPE_LABELS: Record<UnitType, { en: string; ar: string }> = {
  commercial: { en: 'Commercial', ar: 'تجاري' },
  residential: { en: 'Residential', ar: 'سكني' },
}

/** A unit available for / referenced by bookings (GET/POST /api/units). */
export interface Unit {
  id: string
  unitNumber: string
  type: UnitType
  /** Optional free-text description / notes. */
  description?: string
  /** True if a booking already exists for this unit. */
  booked?: boolean
}

/** One entry in a booking's postpone history. */
export interface PostponeRecord {
  fromDate: string
  fromTime: string
  toDate: string
  toTime: string
  at: string
}

/** Mirrors the fields of the HPD Home Connect JotForm. */
export interface Booking {
  id: string
  unitNumber: string
  /** Snapshot of the unit's category at booking time (commercial/residential). */
  unitType?: UnitType
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
  /** True if this customer's mobile is barred from booking online (admin-set). */
  blocked?: boolean
  /** ISO datetime the form was submitted. */
  submittedAt: string
  /** How many times the booking has been postponed (0/undefined if never). */
  postponeCount?: number
  /** Original installation date/time before the first postpone. */
  originalDate?: string | null
  originalTime?: string | null
  postponeHistory?: PostponeRecord[] | null
}
