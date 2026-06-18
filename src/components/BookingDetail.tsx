import {
  X,
  Phone,
  Home,
  CalendarClock,
  FileImage,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react'
import type { Booking, BookingStatus } from '../types'
import { STATUSES } from '../types'
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
  onDelete,
}: {
  booking: Booking | null
  onClose: () => void
  onStatusChange: (id: string, status: BookingStatus) => void
  onDelete: (id: string) => void
}) {
  if (!booking) return null

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
              <p className="text-xs font-medium uppercase tracking-wide text-brand-300/80">
                Booking #{booking.id}
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

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-3">
            <Avatar firstName={booking.firstName} lastName={booking.lastName} />
            <div>
              <p className="font-medium text-slate-900">
                {fullName(booking.firstName, booking.lastName)}
              </p>
              <p className="text-xs text-slate-400">Unit owner</p>
            </div>
            <span className="ml-auto">
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

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400">
              Submitted {formatDateTime(booking.submittedAt)}
            </p>
            <button
              type="button"
              onClick={() => onDelete(booking.id)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
