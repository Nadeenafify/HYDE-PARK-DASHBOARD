import type { BookingStatus } from '../types'

/** Local YYYY-MM-DD for the real current day — drives all "today"/relative-date
 * logic (TODAY badges, "Installing Today", Schedule upcoming filter). Computed
 * live so it never drifts; do NOT hardcode an anchor here. */
export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

/** "2026-06-18" -> "Thu, Jun 18, 2026" */
export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** "2026-06-18" -> "Jun 18" */
export function formatDateShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  return mobile
}

export function daysFromToday(iso: string): number {
  const a = new Date(`${iso}T00:00:00`).getTime()
  const b = new Date(`${todayISO()}T00:00:00`).getTime()
  return Math.round((a - b) / 86_400_000)
}

export function isToday(iso: string): boolean {
  return iso === todayISO()
}

export const STATUS_META: Record<
  BookingStatus,
  { label: string; dot: string; badge: string; text: string }
> = {
  pending: {
    label: 'Pending',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    text: 'text-amber-600',
  },
  confirmed: {
    label: 'Confirmed',
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    text: 'text-sky-600',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    text: 'text-emerald-600',
  },
  cancelled: {
    label: 'Cancelled',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    text: 'text-rose-600',
  },
}
