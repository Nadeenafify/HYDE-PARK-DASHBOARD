import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronRight, Clock } from 'lucide-react'
import type { Booking, BookingStatus } from '../types'
import { TIME_SLOTS, STATUSES } from '../types'
import {
  fullName,
  formatDate,
  isToday,
  daysFromToday,
  STATUS_META,
} from '../lib/utils'
import {
  Avatar,
  Pagination,
  StatusBadge,
  SearchInput,
  FilterChips,
  type FilterOption,
} from './ui'
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
    const active = base
      .filter((b) => statusFilter === 'all' || b.status === statusFilter)
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

  const statusOptions: FilterOption<StatusFilter>[] = statusFilters.map((s) => ({
    key: s,
    label: s === 'all' ? 'All' : STATUS_META[s].label,
    count: counts[s],
    dot: s === 'all' ? undefined : STATUS_META[s].dot,
  }))

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name or unit…"
          className="w-full sm:max-w-xs"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
          <FilterChips
            label="Status"
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
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
                      className="group cursor-pointer transition hover:bg-brand-50/40"
                    >
                      {/* Desktop / tablet: timeline row */}
                      <div className="hidden items-center gap-4 px-5 py-3 sm:flex">
                        <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-600">
                          {b.timeSlot}
                        </span>

                        {/* Timeline rail — a line with a status-colored marker */}
                        <div className="relative flex w-4 shrink-0 items-center justify-center self-stretch">
                          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-100 transition group-hover:bg-brand-200" />
                          <span
                            className={`relative h-2.5 w-2.5 rounded-full ring-4 ring-white ${STATUS_META[b.status].dot}`}
                          />
                        </div>

                        <Avatar firstName={b.firstName} lastName={b.lastName} />

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
                          className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
                        />
                      </div>

                      {/* Mobile: stacked card (matches the Bookings layout) */}
                      <div className="flex flex-col gap-2 px-5 py-4 sm:hidden">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar firstName={b.firstName} lastName={b.lastName} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-800">
                                {fullName(b.firstName, b.lastName)}
                              </p>
                              <p className="truncate text-xs text-slate-400">
                                {b.unitNumber}
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={b.status} />
                        </div>
                        <div className="flex items-center gap-1.5 pl-12 text-sm text-slate-600">
                          <Clock size={14} className="shrink-0 text-slate-400" />
                          <span className="font-medium tabular-nums">
                            {b.timeSlot}
                          </span>
                        </div>
                      </div>
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
