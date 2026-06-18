import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronRight, Search } from 'lucide-react'
import type { Booking, BookingStatus } from '../types'
import { TIME_SLOTS, STATUSES } from '../types'
import {
  fullName,
  formatDate,
  isToday,
  daysFromToday,
  STATUS_META,
} from '../lib/utils'
import { Avatar, Pagination, StatusBadge } from './ui'
import { usePagination } from '../hooks/usePagination'

type StatusFilter = BookingStatus | 'all'

/** Compact calendar parts for a day tile, e.g. { weekday: "THU", day: "18" }. */
function dateParts(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    day: d.toLocaleDateString('en-US', { day: 'numeric' }),
  }
}

/** "Today" / "Tomorrow" / "In 3 days" relative to the demo anchor. */
function relativeLabel(iso: string): string {
  const days = daysFromToday(iso)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

export function Schedule({
  bookings,
  onSelect,
}: {
  bookings: Booking[]
  onSelect: (b: Booking) => void
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Upcoming, non-cancelled bookings matching the search — the set the status
  // filter pills count against, before the status filter itself is applied.
  const base = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bookings.filter(
      (b) =>
        b.status !== 'cancelled' &&
        daysFromToday(b.installationDate) >= 0 &&
        (!q ||
          fullName(b.firstName, b.lastName).toLowerCase().includes(q) ||
          b.unitNumber.toLowerCase().includes(q)),
    )
  }, [bookings, query])

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: base.length,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    }
    for (const b of base) c[b.status]++
    return c
  }, [base])

  const days = useMemo(() => {
    const active =
      statusFilter === 'all'
        ? base
        : base.filter((b) => b.status === statusFilter)
    const byDate = new Map<string, Booking[]>()
    for (const b of active) {
      const list = byDate.get(b.installationDate) ?? []
      list.push(b)
      byDate.set(b.installationDate, list)
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, list]) => ({
        date,
        list: list.sort(
          (a, b) => TIME_SLOTS.indexOf(a.timeSlot) - TIME_SLOTS.indexOf(b.timeSlot),
        ),
      }))
  }, [base, statusFilter])

  // Paginate by day group — a handful of days per page.
  const { pageItems, page, pageSize, total, totalPages, start, setPage, setPageSize } =
    usePagination(days, 5)

  // Jump back to the first page whenever the filters change.
  useEffect(() => {
    setPage(1)
  }, [query, statusFilter, setPage])

  const statusFilters = [
    'all',
    ...STATUSES.filter((s) => s !== 'cancelled'),
  ] as StatusFilter[]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="group relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-600"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or unit…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {statusFilters.map((s) => {
            const active = statusFilter === s
            const label = s === 'all' ? 'All' : STATUS_META[s].label
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? 'bg-linear-to-r from-slate-900 to-slate-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                    active ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                  }`}
                >
                  {counts[s]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/70 bg-white py-20 text-center shadow-soft">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
            <CalendarDays size={28} />
          </span>
          <p className="text-sm text-slate-500">
            No upcoming installations match your filters.
          </p>
        </div>
      ) : (
        <>
          {pageItems.map(({ date, list }) => {
            const today = isToday(date)
            const { weekday, day } = dateParts(date)
            return (
              <div
                key={date}
                className={`overflow-hidden rounded-2xl border bg-white shadow-soft transition ${
                  today
                    ? 'border-brand-200 ring-1 ring-brand-500/15'
                    : 'border-slate-200/70'
                }`}
              >
                <div
                  className={`flex items-center gap-3 border-b px-4 py-3.5 sm:gap-4 sm:px-5 ${
                    today
                      ? 'border-brand-100/70 bg-linear-to-r from-brand-50/80 to-white'
                      : 'border-slate-100 bg-linear-to-r from-slate-50 to-white'
                  }`}
                >
                  {/* Calendar date tile */}
                  <div
                    className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${
                      today
                        ? 'bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold leading-none tracking-wide ${
                        today ? 'text-white/80' : 'text-slate-400'
                      }`}
                    >
                      {weekday}
                    </span>
                    <span className="text-lg font-bold leading-tight">{day}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-2 truncate text-sm font-semibold text-slate-800">
                      {formatDate(date)}
                      {today && (
                        <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-brand-700 ring-1 ring-inset ring-brand-200">
                          TODAY
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">{relativeLabel(date)}</p>
                  </div>

                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    {list.length}
                    <span className="hidden sm:inline">
                      {' '}
                      installation{list.length > 1 ? 's' : ''}
                    </span>
                  </span>
                </div>

                <ul>
                  {list.map((b) => (
                    <li
                      key={b.id}
                      onClick={() => onSelect(b)}
                      className="group flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-brand-50/40 sm:gap-4 sm:px-5"
                    >
                      <span className="w-14 shrink-0 whitespace-nowrap text-xs font-semibold tabular-nums text-slate-600 sm:w-16 sm:text-right sm:text-sm">
                        {b.timeSlot}
                      </span>

                      {/* Timeline rail — decorative; hidden on mobile to free up width */}
                      <div className="relative hidden w-4 shrink-0 items-center justify-center self-stretch sm:flex">
                        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-100 transition group-hover:bg-brand-200" />
                        <span
                          className={`relative h-2.5 w-2.5 rounded-full ring-4 ring-white ${STATUS_META[b.status].dot}`}
                        />
                      </div>

                      <span className="hidden shrink-0 sm:block">
                        <Avatar firstName={b.firstName} lastName={b.lastName} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800 transition group-hover:text-brand-800">
                          {fullName(b.firstName, b.lastName)}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {b.unitNumber}
                        </p>
                      </div>

                      <StatusBadge status={b.status} />

                      <ChevronRight
                        size={16}
                        className="hidden shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500 sm:block"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}

          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              start={start}
              pageSizes={[5, 10, 20]}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              noun="days"
              topBorder={false}
            />
          </div>
        </>
      )}
    </div>
  )
}
