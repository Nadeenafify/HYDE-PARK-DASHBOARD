import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Search } from 'lucide-react'
import type { Booking, BookingStatus } from '../types'
import { TIME_SLOTS, STATUSES } from '../types'
import {
  fullName,
  formatDate,
  isToday,
  daysFromToday,
  STATUS_META,
} from '../lib/utils'
import { Pagination } from './ui'
import { usePagination } from '../hooks/usePagination'

type StatusFilter = BookingStatus | 'all'

export function Schedule({
  bookings,
  onSelect,
}: {
  bookings: Booking[]
  onSelect: (b: Booking) => void
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const days = useMemo(() => {
    const q = query.trim().toLowerCase()
    const active = bookings.filter(
      (b) =>
        b.status !== 'cancelled' &&
        daysFromToday(b.installationDate) >= 0 &&
        (statusFilter === 'all' || b.status === statusFilter) &&
        (!q ||
          fullName(b.firstName, b.lastName).toLowerCase().includes(q) ||
          b.unitNumber.toLowerCase().includes(q)),
    )
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
  }, [bookings, query, statusFilter])

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
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or unit…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
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
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm">
          <CalendarDays className="text-slate-300" size={32} />
          <p className="text-sm text-slate-500">
            No upcoming installations match your filters.
          </p>
        </div>
      ) : (
        <>
          {pageItems.map(({ date, list }) => (
            <div
              key={date}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {formatDate(date)}
                  </h3>
                  {isToday(date) && (
                    <span className="rounded bg-teal-700/10 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">
                      TODAY
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {list.length} installation{list.length > 1 ? 's' : ''}
                </span>
              </div>
              <ul className="divide-y divide-slate-50">
                {list.map((b) => (
                  <li
                    key={b.id}
                    onClick={() => onSelect(b)}
                    className="flex cursor-pointer items-center gap-4 px-5 py-3 transition hover:bg-slate-50/80"
                  >
                    <span className="w-20 shrink-0 text-sm font-medium text-slate-700">
                      {b.timeSlot}
                    </span>
                    <div className="h-8 w-px bg-slate-100" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">
                        {fullName(b.firstName, b.lastName)}
                      </p>
                      <p className="text-xs text-slate-400">{b.unitNumber}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${STATUS_META[b.status].text}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${STATUS_META[b.status].dot}`}
                      />
                      {STATUS_META[b.status].label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
