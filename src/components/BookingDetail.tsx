import { useState } from 'react'
import {
  X,
  Phone,
  Home,
  CalendarClock,
  FileImage,
  CheckCircle2,
  XCircle,
  History,
} from 'lucide-react'
import type { Booking, BookingStatus } from '../types'
import { STATUSES, TIME_SLOTS } from '../types'
import {
  fullName,
  formatDate,
  formatDateTime,
  formatMobile,
  STATUS_META,
} from '../lib/utils'
import { Avatar, StatusBadge } from './ui'

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <div className="mt-0.5 text-sm text-slate-800">{children}</div>
      </div>
    </div>
  )
}

export function BookingDetail({
  booking,
  onClose,
  onStatusChange,
  onPostpone,
  canManage,
}: {
  booking: Booking | null
  onClose: () => void
  onStatusChange: (id: string, status: BookingStatus) => void
  onPostpone: (id: string, date: string, time: string) => Promise<void>
  /** Viewers (read-only) don't get the status / postpone controls. */
  canManage: boolean
}) {
  const [rescheduling, setRescheduling] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [postponing, setPostponing] = useState(false)
  const [postponeError, setPostponeError] = useState<string | null>(null)

  if (!booking) return null

  // The raw id is a long UUID — show a short, readable reference instead.
  const shortId = booking.id.slice(0, 8).toUpperCase()
  const todayISO = new Date().toISOString().slice(0, 10)

  function openReschedule() {
    if (!booking) return
    setNewDate(booking.installationDate)
    setNewTime(booking.timeSlot)
    setPostponeError(null)
    setRescheduling(true)
  }

  async function doPostpone() {
    if (!booking) return
    setPostponeError(null)
    setPostponing(true)
    try {
      await onPostpone(booking.id, newDate, newTime)
      setRescheduling(false)
    } catch (e) {
      setPostponeError(e instanceof Error ? e.message : 'Failed to postpone.')
    } finally {
      setPostponing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="animate-fade absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="animate-slide-in relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-pop">
        <div className="relative overflow-hidden border-b border-slate-100 bg-linear-to-br from-slate-900 to-slate-800 px-6 py-5">
          <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-brand-500/20" />
          <span className="pointer-events-none absolute -bottom-10 right-10 h-20 w-20 rounded-full bg-white/5" />
          <div className="relative flex items-start justify-between">
            <div>
              <p
                className="text-xs font-medium uppercase tracking-wide text-brand-300/80"
                title={`Booking ${booking.id}`}
              >
                Booking #{shortId}
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-white">
                Unit {booking.unitNumber}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable details */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-3">
            <Avatar firstName={booking.firstName} lastName={booking.lastName} />
            <div>
              <p className="font-medium text-slate-900">
                {fullName(booking.firstName, booking.lastName)}
              </p>
              <p className="text-xs text-slate-400">Unit owner</p>
            </div>
            <span className="ml-auto flex items-center gap-1.5">
              {(booking.postponeCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                  <History size={11} /> مؤجل
                </span>
              )}
              <StatusBadge status={booking.status} />
            </span>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <Field icon={<Home size={16} />} label="Unit Number / رقم الوحدة">
              {booking.unitNumber}
            </Field>
            <Field icon={<Phone size={16} />} label="Mobile / رقم التليفون">
              <a
                href={`tel:${booking.mobile}`}
                className="font-medium text-brand-700 hover:underline"
              >
                {formatMobile(booking.mobile)}
              </a>
            </Field>
            <Field
              icon={<CalendarClock size={16} />}
              label="Installation / معاد التركيب"
            >
              {formatDate(booking.installationDate)} · {booking.timeSlot}
            </Field>
            {(booking.postponeCount ?? 0) > 0 && (
              <Field icon={<History size={16} />} label="Original / الموعد الأصلي">
                {booking.originalDate
                  ? `${formatDate(booking.originalDate)} · ${booking.originalTime ?? ''}`
                  : '—'}
                <span className="text-xs text-slate-400">
                  {' '}
                  · مؤجل {booking.postponeCount}×
                </span>
              </Field>
            )}
            <Field icon={<FileImage size={16} />} label="HPD Receipt / الإيصال">
              {booking.receiptUrl ? (
                <a
                  href={booking.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline"
                >
                  <CheckCircle2 size={14} /> View receipt
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-rose-600">
                  <XCircle size={14} /> Missing
                </span>
              )}
            </Field>
            <Field
              icon={
                booking.termsAccepted ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <XCircle size={16} />
                )
              }
              label="Terms / الشروط"
            >
              {booking.termsAccepted ? (
                <span className="text-emerald-600">Accepted</span>
              ) : (
                <span className="text-rose-600">Not accepted</span>
              )}
            </Field>
          </div>
        </div>

        {/* Pinned action footer */}
        <div className="space-y-3 border-t border-slate-100 bg-white px-6 py-4">
          {canManage && (
            <>
          {/* Postpone / reschedule */}
          {rescheduling ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Postpone to / تأجيل إلى
              </p>
              <div className="flex gap-2">
                <input
                  type="date"
                  min={todayISO}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="" disabled>
                    Time
                  </option>
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              {postponeError && (
                <p className="text-xs font-medium text-rose-600">{postponeError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={doPostpone}
                  disabled={postponing || !newDate || !newTime}
                  className="flex-1 rounded-lg bg-linear-to-r from-slate-900 to-slate-800 px-3 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {postponing ? 'Saving…' : 'Confirm postpone'}
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduling(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            booking.status !== 'cancelled' && (
              <button
                type="button"
                onClick={openReschedule}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <CalendarClock size={15} /> Postpone / تأجيل
              </button>
            )
          )}

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Update status
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {STATUSES.map((s) => {
                const active = s === booking.status
                const meta = STATUS_META[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onStatusChange(booking.id, s)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'border-slate-900 bg-linear-to-r from-slate-900 to-slate-800 text-white shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>
            </>
          )}
          <p className="text-xs text-slate-400">
            Submitted {formatDateTime(booking.submittedAt)}
          </p>
        </div>
      </div>
    </div>
  )
}
