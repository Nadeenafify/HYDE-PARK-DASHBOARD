import { useMemo } from 'react'
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  CalendarCheck,
  FileWarning,
} from 'lucide-react'
import type { Booking } from '../types'
import { TIME_SLOTS, STATUSES } from '../types'
import {
  fullName,
  formatDate,
  isToday,
  daysFromToday,
  STATUS_META,
} from '../lib/utils'
import { StatCard, SectionCard, Avatar, StatusBadge } from './ui'

export function Overview({
  bookings,
  onSelect,
}: {
  bookings: Booking[]
  onSelect: (b: Booking) => void
}) {
  const stats = useMemo(() => {
    const total = bookings.length
    const pending = bookings.filter((b) => b.status === 'pending').length
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length
    const completed = bookings.filter((b) => b.status === 'completed').length
    const today = bookings.filter(
      (b) => isToday(b.installationDate) && b.status !== 'cancelled',
    ).length
    const missingReceipt = bookings.filter(
      (b) => !b.receiptUrl && b.status !== 'cancelled',
    ).length
    return { total, pending, confirmed, completed, today, missingReceipt }
  }, [bookings])

  const slotData = useMemo(() => {
    const map = new Map<string, number>(TIME_SLOTS.map((s) => [s, 0]))
    for (const b of bookings) {
      if (b.status === 'cancelled') continue
      map.set(b.timeSlot, (map.get(b.timeSlot) ?? 0) + 1)
    }
    const max = Math.max(1, ...map.values())
    return TIME_SLOTS.map((s) => ({
      slot: s,
      count: map.get(s) ?? 0,
      pct: ((map.get(s) ?? 0) / max) * 100,
    }))
  }, [bookings])

  const statusData = useMemo(() => {
    return STATUSES.map((s) => ({
      status: s,
      count: bookings.filter((b) => b.status === s).length,
    }))
  }, [bookings])

  const upcoming = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            daysFromToday(b.installationDate) >= 0 && b.status !== 'cancelled',
        )
        .sort(
          (a, b) =>
            a.installationDate.localeCompare(b.installationDate) ||
            TIME_SLOTS.indexOf(a.timeSlot) - TIME_SLOTS.indexOf(b.timeSlot),
        )
        .slice(0, 6),
    [bookings],
  )

  const total = bookings.length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Bookings"
          value={stats.total}
          hint="All-time submissions"
          icon={<ClipboardList size={18} />}
          tone="slate"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          hint="Awaiting confirmation"
          icon={<Clock size={18} />}
          tone="amber"
        />
        <StatCard
          label="Installing Today"
          value={stats.today}
          hint={formatDate('2026-06-17')}
          icon={<CalendarCheck size={18} />}
          tone="brand"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          hint="Installations done"
          icon={<CheckCircle2 size={18} />}
          tone="emerald"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard title="Bookings by time slot" className="lg:col-span-2">
          <div className="space-y-3 px-5 py-5">
            {slotData.map((d) => (
              <div key={d.slot} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-right text-xs font-medium text-slate-500">
                  {d.slot}
                </span>
                <div className="h-6 flex-1 overflow-hidden rounded-lg bg-slate-100/80">
                  <div
                    className="bar-grow flex h-full items-center justify-end rounded-lg bg-linear-to-r from-brand-400 to-brand-600 pr-2 shadow-sm"
                    style={{ width: `${Math.max(d.pct, d.count ? 8 : 0)}%` }}
                  >
                    {d.count > 0 && d.pct > 22 && (
                      <span className="text-[10px] font-bold text-white">
                        {d.count}
                      </span>
                    )}
                  </div>
                </div>
                <span className="w-6 shrink-0 text-xs font-semibold text-slate-600">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Status breakdown">
            <div className="space-y-4 px-5 py-5">
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/60">
                {statusData.map((d) =>
                  d.count ? (
                    <div
                      key={d.status}
                      className={`${STATUS_META[d.status].dot} transition-all`}
                      style={{ width: `${(d.count / total) * 100}%` }}
                      title={`${STATUS_META[d.status].label}: ${d.count}`}
                    />
                  ) : null,
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {statusData.map((d) => (
                  <div
                    key={d.status}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${STATUS_META[d.status].dot}`}
                    />
                    <span className="text-sm text-slate-600">
                      {STATUS_META[d.status].label}
                    </span>
                    <span className="ml-auto text-sm font-bold text-slate-800">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <div className="flex items-center gap-4 rounded-2xl border border-amber-200/70 bg-linear-to-br from-amber-50 to-orange-50 px-5 py-4 shadow-soft">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <FileWarning size={22} />
            </span>
            <div>
              <p className="text-2xl font-bold text-amber-700">
                {stats.missingReceipt}
              </p>
              <p className="text-xs font-medium text-amber-600">
                active bookings missing a receipt
              </p>
            </div>
          </div>
        </div>
      </div>

      <SectionCard title="Upcoming installations">
        <ul className="divide-y divide-slate-50">
          {upcoming.map((b) => {
            const days = daysFromToday(b.installationDate)
            return (
              <li
                key={b.id}
                onClick={() => onSelect(b)}
                className="group flex cursor-pointer flex-col gap-2 px-5 py-3 transition hover:bg-brand-50/40 sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar firstName={b.firstName} lastName={b.lastName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800 transition group-hover:text-brand-800">
                      {fullName(b.firstName, b.lastName)}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {b.unitNumber} · {b.timeSlot}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pl-12 sm:justify-end sm:pl-0">
                  <div className="sm:text-right">
                    <p className="text-sm text-slate-700">
                      {formatDate(b.installationDate)}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        days === 0 ? 'text-brand-600' : 'text-slate-400'
                      }`}
                    >
                      {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days} days`}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </li>
            )
          })}
          {upcoming.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-slate-400">
              No upcoming installations.
            </li>
          )}
        </ul>
      </SectionCard>
    </div>
  )
}
