import type { Booking, BookingStatus, TimeSlot, Unit } from '../types'
import { TIME_SLOTS } from '../types'
import { getToken, clearToken, notifyUnauthorized } from './auth'

/**
 * API client for the HPD Triple Play backend.
 *
 *   GET    /api/health
 *   GET    /api/units
 *   POST   /api/units              (JSON)
 *   POST   /api/bookings           (multipart/form-data, file upload)
 *   GET    /api/bookings           (optional ?status=pending)
 *   GET    /api/bookings/:id
 *   PATCH  /api/bookings/:id/status (JSON)
 *   DELETE /api/bookings/:id
 *
 * Base URL comes from VITE_API_URL (default "/api", proxied to the backend in
 * dev — see vite.config.ts). The map* helpers below are deliberately tolerant
 * of field naming (camelCase / snake_case / nested) so the dashboard renders
 * even if the backend's exact JSON differs. Adjust them to match your contract.
 */
const BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
 
  const token = getToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(
      'Could not reach the API. Is the backend running?',
      0,
    )
  }
  if (!res.ok) {
    // A 401 on an authenticated call means the token is missing/expired —
    // drop the session so the app falls back to the login screen.
    if (res.status === 401 && token) {
      clearToken()
      notifyUnauthorized()
    }
    let message = `Request failed (${res.status} ${res.statusText})`
    try {
      const body = await res.json()
      message = body?.message ?? body?.error ?? message
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status)
  }
  if (res.status === 204) return undefined as T
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return undefined as T
  return (await res.json()) as T
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/* ---------------------------------------------------------------- mapping -- */

function asArray(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[]
  const obj = (json ?? {}) as Record<string, unknown>
  for (const key of ['data', 'bookings', 'units', 'items', 'results']) {
    if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[]
  }
  return []
}

function pick(o: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (o[k] != null && o[k] !== '') return o[k]
  }
  return undefined
}

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function normalizeStatus(raw: unknown): BookingStatus {
  const s = str(raw).toLowerCase()
  if (s.startsWith('confirm')) return 'confirmed'
  if (s.startsWith('complete') || s === 'done' || s === 'installed')
    return 'completed'
  if (s.startsWith('cancel') || s === 'rejected') return 'cancelled'
  return 'pending'
}

/** Coerce assorted time formats ("13:00", "10 AM", "10:00:00") to a slot label. */
function normalizeTimeSlot(raw: unknown): TimeSlot {
  const s = str(raw).trim()
  if ((TIME_SLOTS as readonly string[]).includes(s)) return s as TimeSlot
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (m) {
    let hour = parseInt(m[1], 10)
    const mer = m[3]?.toLowerCase()
    if (mer === 'pm' && hour < 12) hour += 12
    if (mer === 'am' && hour === 12) hour = 0
    const period = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 === 0 ? 12 : hour % 12
    const label = `${h12}:00 ${period}`
    if ((TIME_SLOTS as readonly string[]).includes(label)) return label as TimeSlot
  }
  return (s || TIME_SLOTS[0]) as TimeSlot
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/)
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') }
}

export function mapBooking(raw: Record<string, unknown>): Booking {
  const ownerRaw = pick(raw, 'owner', 'ownerName', 'owner_name', 'name')
  let first = str(pick(raw, 'firstName', 'first_name', 'first'))
  let last = str(pick(raw, 'lastName', 'last_name', 'last'))
  if (ownerRaw && typeof ownerRaw === 'object') {
    const o = ownerRaw as Record<string, unknown>
    first ||= str(pick(o, 'first', 'firstName', 'first_name'))
    last ||= str(pick(o, 'last', 'lastName', 'last_name'))
  } else if (ownerRaw && (!first || !last)) {
    const split = splitName(str(ownerRaw))
    first ||= split.first
    last ||= split.last
  }

  const receipt = pick(
    raw,
    'receiptPath',
    'receiptUrl',
    'receipt_url',
    'receipt',
    'receiptImage',
    'receiptFilename',
    'file',
  )

  return {
    id: str(pick(raw, 'id', '_id', 'bookingId', 'submissionId')),
    unitNumber: str(
      pick(raw, 'unitCode', 'unitNumber', 'unit_number', 'unit', 'unitNo', 'code'),
    ),
    firstName: first,
    lastName: last,
    mobile: str(pick(raw, 'mobile', 'phone', 'mobileNumber', 'mobile_number')),
    receiptUrl: receipt ? str(receipt) : null,
    installationDate: str(
      pick(raw, 'installationDate', 'installation_date', 'date'),
    ).slice(0, 10),
    timeSlot: normalizeTimeSlot(
      pick(raw, 'installationTime', 'timeSlot', 'time_slot', 'slot', 'time'),
    ),
    termsAccepted: Boolean(
      pick(
        raw,
        'agreedToTerms',
        'termsAccepted',
        'terms_accepted',
        'terms',
        'agreed',
      ) ?? false,
    ),
    status: normalizeStatus(pick(raw, 'status', 'state')),
    submittedAt: str(
      pick(raw, 'submittedAt', 'submitted_at', 'createdAt', 'created_at') ??
        new Date().toISOString(),
    ),
    postponeCount: Number(pick(raw, 'postponeCount', 'postpone_count') ?? 0) || 0,
    originalDate: (() => {
      const d = pick(raw, 'originalDate', 'original_date')
      return d ? str(d).slice(0, 10) : null
    })(),
    originalTime: (() => {
      const t = pick(raw, 'originalTime', 'original_time')
      return t ? normalizeTimeSlot(t) : null
    })(),
    postponeHistory: Array.isArray(raw.postponeHistory)
      ? (raw.postponeHistory as Booking['postponeHistory'])
      : null,
  }
}

export function mapUnit(raw: Record<string, unknown>): Unit {
  const type = pick(raw, 'description', 'type', 'unitType')
  const owner = pick(raw, 'owner', 'ownerName')
  return {
    id: str(pick(raw, 'id', '_id', 'unitId') ?? pick(raw, 'code', 'unitNumber')),
    unitNumber: str(
      pick(raw, 'code', 'unitNumber', 'unit_number', 'unit', 'number', 'name'),
    ),
    type: type ? str(type) : undefined,
    owner: owner ? str(owner) : undefined,
    booked: Boolean(pick(raw, 'booked', 'hasBooking', 'isBooked') ?? false),
  }
}

/* ----------------------------------------------------------------- client -- */

export const api = {
  health: () => request<unknown>('/health'),

  /** Verify admin credentials against the backend and return a signed JWT. */
  login: async (username: string, password: string): Promise<string> => {
    const res = await request<{ token?: string }>(
      '/login',
      jsonInit('POST', { username, password }),
    )
    if (!res?.token) {
      throw new ApiError('Login failed: no token returned', 500)
    }
    return res.token
  },

  getUnits: async (): Promise<Unit[]> =>
    asArray(await request<unknown>('/units')).map(mapUnit),

  createUnit: async (payload: {
    unitNumber: string
    type?: string
    owner?: string
  }): Promise<Unit> => {
    // Backend stores units as { code, description }.
    const body = { code: payload.unitNumber, description: payload.type ?? null }
    const res = await request<Record<string, unknown>>(
      '/units',
      jsonInit('POST', body),
    )
    return mapUnit(res ?? { code: payload.unitNumber, description: payload.type })
  },

  /** Import many units at once (e.g. parsed from an Excel file). */
  importUnits: async (
    units: { code: string; description?: string }[],
  ): Promise<{ created: number; skipped: number; total: number }> =>
    request('/units/bulk', jsonInit('POST', { units })),

  /** Full data snapshot for download (admin). */
  getBackup: (): Promise<unknown> => request('/backup'),

  /** Re-add missing records from a backup file (admin). */
  restore: (
    data: unknown,
  ): Promise<{
    units: { created: number; skipped: number }
    bookings: { created: number; skipped: number }
  }> => request('/backup/restore', jsonInit('POST', data)),

  getBookings: async (status?: BookingStatus): Promise<Booking[]> => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    return asArray(await request<unknown>(`/bookings${qs}`)).map(mapBooking)
  },

  getBooking: async (id: string): Promise<Booking> =>
    mapBooking(await request<Record<string, unknown>>(`/bookings/${id}`)),

  /** Public form submission (multipart, includes the receipt file). */
  createBooking: (form: FormData): Promise<unknown> =>
    request('/bookings', { method: 'POST', body: form }),

  updateStatus: async (id: string, status: BookingStatus): Promise<void> => {
    await request(`/bookings/${id}/status`, jsonInit('PATCH', { status }))
  },

  /** Reschedule a booking to a new date/time; returns the updated booking. */
  postpone: async (
    id: string,
    installationDate: string,
    installationTime: string,
  ): Promise<Booking> =>
    mapBooking(
      await request<Record<string, unknown>>(
        `/bookings/${id}/postpone`,
        jsonInit('PATCH', { installationDate, installationTime }),
      ),
    ),

  deleteBooking: async (id: string): Promise<void> => {
    await request(`/bookings/${id}`, { method: 'DELETE' })
  },
}
