import { useEffect, useState } from 'react'
import {
  X,
  Phone,
  Home,
  CalendarClock,
  FileImage,
  CheckCircle2,
  XCircle,
  History,
  Ban,
  ShieldCheck,
} from 'lucide-react'
import type { Booking, BookingStatus } from '../types'
import { STATUSES, TIME_SLOTS } from '../types'
import { api } from '../lib/api'
import {
  fullName,
  formatDate,
  formatDateTime,
  formatMobile,
  STATUS_META,
} from '../lib/utils'
import { Avatar, StatusBadge } from './ui'
import { HolidayCalendar } from './HolidayCalendar'

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
  onBlockedChange,
  onPostpone,
  canManage,
}: {
  booking: Booking | null
  onClose: () => void
  onStatusChange: (id: string, status: BookingStatus) => void
  onBlockedChange: (id: string, blocked: boolean) => void
  onPostpone: (id: string, date: string, time: string) => Promise<void>
  /** Viewers (read-only) don't get the status / postpone controls. */
  canManage: boolean
}) {
  const [rescheduling, setRescheduling] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [postponing, setPostponing] = useState(false)
  const [postponeError, setPostponeError] = useState<string | null>(null)
  // Admin-declared holidays, "YYYY-MM-DD" -> reason. null = not loaded yet.
  // Loaded eagerly when the panel opens so a holiday is caught the instant a
  // date is picked, and confirm stays blocked until it has actually loaded.
  const [closedDays, setClosedDays] = useState<Map<string, string> | null>(null)

  useEffect(() => {
    if (!booking) return
    let active = true
    api
      .getClosedDays()
      .then((days) => {
        if (active)
          setClosedDays(new Map(days.map((d) => [d.date, d.reason ?? ''])))
      })
      .catch(() => {
        // Non-fatal: the server still rejects holidays on submit.
        if (active) setClosedDays(new Map())
      })
    return () => {
      active = false
    }
  }, [])

  if (!booking) return null

  // The raw id is a long UUID — show a short, readable reference instead.
  const shortId = booking.id.slice(0, 8).toUpperCase()
  const todayISO = new Date().toISOString().slice(0, 10)

  /**
   * Why `date` (YYYY-MM-DD) can't be a postpone target, or null if it's fine.
   * Mirrors the backend's assertBookableDate: Fri/Sat and admin-closed days are
   * official holidays. Uses UTC weekday to match the server exactly.
   */
  function holidayReason(date: string): string | null {
    if (!date) return null
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    if (weekday === 5 || weekday === 6) {
      return 'الجمعة والسبت إجازة رسمية · Fridays & Saturdays are official holidays.'
    }
    const reason = closedDays?.get(date)
    if (reason !== undefined) {
      return reason
        ? `عطلة رسمية (${reason}) · Official holiday.`
        : 'عطلة رسمية · Official holiday.'
    }
    return null
  }

  const dateIssue = holidayReason(newDate)

  function openReschedule() {
    if (!booking) return
    setNewDate(booking.installationDate)
    setNewTime(booking.timeSlot)
    setPostponeError(null)
    setRescheduling(true)
  }

  async function doPostpone() {
    if (!booking) return
    // Don't submit until the holiday list is loaded, then re-check the date.
    if (closedDays === null) return
    const issue = holidayReason(newDate)
    if (issue) {
      setPostponeError(issue)
      return
    }
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

          {booking.blocked && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <Ban size={16} className="mt-0.5 shrink-0" />
              <p>
                <span className="font-semibold">Blocked from online booking.</span>{' '}
                This customer must call customer service to book again. هذا العميل
                محظور من الحجز عبر الموقع.
              </p>
            </div>
          )}

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
                <p className="text-slate-800">
                  {booking.originalDate
                    ? `${formatDate(booking.originalDate)} · ${booking.originalTime ?? ''}`
                    : '—'}
                </p>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                  <History size={11} /> Postponed {booking.postponeCount}× · مؤجل
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
              <HolidayCalendar
                value={newDate}
                onChange={(iso) => {
                  setNewDate(iso)
                  setPostponeError(null)
                }}
                minISO={todayISO}
                closedDays={closedDays}
              />
              <select
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="" disabled>
                  Time / الوقت
                </option>
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {dateIssue ? (
                <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                  <Ban size={13} className="mt-px shrink-0" />
                  <span>{dateIssue}</span>
                </p>
              ) : (
                closedDays === null && (
                  <p className="text-xs text-slate-400">
                    Checking holidays… · جارٍ التحقق من الإجازات
                  </p>
                )
              )}
              {postponeError && (
                <p className="text-xs font-medium text-rose-600">{postponeError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={doPostpone}
                  disabled={
                    postponing ||
                    !newDate ||
                    !newTime ||
                    !!dateIssue ||
                    closedDays === null
                  }
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

          {/* Block / unblock this customer from self-service online booking */}
          {booking.blocked ? (
            <button
              type="button"
              onClick={() => onBlockedChange(booking.id, false)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <ShieldCheck size={15} /> Unblock customer / إلغاء الحظر
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onBlockedChange(booking.id, true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <Ban size={15} /> Block customer / حظر العميل
            </button>
          )}
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
