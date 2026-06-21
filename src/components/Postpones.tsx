import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  CalendarDays,
  Building2,
  ClipboardList,
  Search,
  ArrowRight,
} from 'lucide-react'
import type { Postpone } from '../types'
import { SectionCard, Pagination, StatCard } from './ui'
import { usePagination } from '../hooks/usePagination'
import { formatDateShort, formatDateTime } from '../lib/utils'
import { api } from '../lib/api'

/** Initials from a free-form admin name; "SY" for system/unattributed. */
function nameInitials(name: string | null): string {
  if (!name) return 'SY'
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? '')
  return (a + b).toUpperCase()
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

/** Repeat moves escalate in color — a booking moved 3+ times stands out. */
function seqTone(n: number): string {
  if (n >= 3) return 'bg-rose-50 text-rose-600 ring-rose-200'
  if (n === 2) return 'bg-amber-50 text-amber-600 ring-amber-200'
  return 'bg-slate-100 text-slate-500 ring-slate-200'
}

export function Postpones() {
  const [rows, setRows] = useState<Postpone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    api
      .getPostpones()
      .then((p) => active && setRows(p))
      .catch(
        (e) =>
          active &&
          setError(e instanceof Error ? e.message : 'Failed to load postpones.'),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const stats = useMemo(() => {
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const perUnit = new Map<string, number>()
    const bookings = new Set<string>()
    let thisMonth = 0
    for (const r of rows) {
      if (r.createdAt.slice(0, 7) === ym) thisMonth++
      perUnit.set(r.unitCode, (perUnit.get(r.unitCode) ?? 0) + 1)
      bookings.add(r.bookingId)
    }
    let topUnit = '—'
    let topCount = 0
    for (const [unit, count] of perUnit) {
      if (count > topCount) {
        topCount = count
        topUnit = unit
      }
    }
    return { total: rows.length, thisMonth, topUnit, topCount, bookings: bookings.size }
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.unitCode.toLowerCase().includes(q) ||
        (r.actorName ?? '').toLowerCase().includes(q),
    )
  }, [rows, query])

  const { pageItems, page, pageSize, total, totalPages, start, setPage, setPageSize } =
    usePagination(filtered, 20)

  useEffect(() => {
    setPage(1)
  }, [query, setPage])

  const showStats = !loading && !error && rows.length > 0

  return (
    <div className="space-y-6">
      {showStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total postpones"
            value={stats.total}
            icon={<CalendarClock size={18} />}
            tone="brand"
          />
          <StatCard
            label="This month"
            value={stats.thisMonth}
            icon={<CalendarDays size={18} />}
            tone="emerald"
          />
          <StatCard
            label="Most moved unit"
            value={stats.topUnit}
            hint={stats.topCount ? `${stats.topCount} postpones` : undefined}
            icon={<Building2 size={18} />}
            tone="amber"
          />
          <StatCard
            label="Bookings affected"
            value={stats.bookings}
            icon={<ClipboardList size={18} />}
            tone="sky"
          />
        </div>
      )}

      <SectionCard
        title={`Postpones (${rows.length})`}
        action={
          <div className="group relative w-full sm:w-56">
            <Search
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-600"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search unit or admin…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
            />
          </div>
        }
      >
        {loading ? (
          <p className="px-5 py-16 text-center text-sm text-slate-400">Loading…</p>
        ) : error ? (
          <p className="px-5 py-16 text-center text-sm text-rose-600">{error}</p>
        ) : total === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
              <CalendarClock size={24} />
            </span>
            <p className="text-sm text-slate-500">
              {rows.length === 0
                ? 'No postpones yet.'
                : 'No postpones match your search.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / tablet: full table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-170 text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">Unit</th>
                    <th className="px-3 py-3">Rescheduled</th>
                    <th className="px-3 py-3 text-center">Move</th>
                    <th className="px-3 py-3">By</th>
                    <th className="px-5 py-3 text-right">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pageItems.map((r) => (
                    <tr key={r.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-sm">
                            <Building2 size={15} />
                          </span>
                          <span className="font-semibold text-slate-800">
                            {r.unitCode}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="whitespace-nowrap rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 line-through ring-1 ring-inset ring-rose-100">
                            {formatDateShort(r.fromDate)} · {r.fromTime}
                          </span>
                          <ArrowRight size={14} className="shrink-0 text-slate-300" />
                          <span className="whitespace-nowrap rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                            {formatDateShort(r.toDate)} · {r.toTime}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${seqTone(
                            r.sequence,
                          )}`}
                          title={`Postpone #${r.sequence} for this booking`}
                        >
                          {ordinal(r.sequence)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                              r.actorName
                                ? 'bg-linear-to-br from-slate-700 to-slate-900 text-white'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {nameInitials(r.actorName)}
                          </span>
                          <span className="truncate text-slate-600">
                            {r.actorName ?? 'System'}
                          </span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs text-slate-400">
                        {formatDateTime(r.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: each postpone collapses into a stacked card */}
            <div className="divide-y divide-slate-100 md:hidden">
              {pageItems.map((r) => (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-sm">
                        <Building2 size={15} />
                      </span>
                      <span className="font-semibold text-slate-800">
                        {r.unitCode}
                      </span>
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${seqTone(
                        r.sequence,
                      )}`}
                      title={`Postpone #${r.sequence} for this booking`}
                    >
                      {ordinal(r.sequence)} move
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="whitespace-nowrap rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 line-through ring-1 ring-inset ring-rose-100">
                      {formatDateShort(r.fromDate)} · {r.fromTime}
                    </span>
                    <ArrowRight size={14} className="shrink-0 text-slate-300" />
                    <span className="whitespace-nowrap rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                      {formatDateShort(r.toDate)} · {r.toTime}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                          r.actorName
                            ? 'bg-linear-to-br from-slate-700 to-slate-900 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {nameInitials(r.actorName)}
                      </span>
                      <span className="truncate text-slate-600">
                        {r.actorName ?? 'System'}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-slate-400">
                      {formatDateTime(r.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              start={start}
              pageSizes={[20, 50, 100]}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              noun="postpones"
            />
          </>
        )}
      </SectionCard>
    </div>
  )
}
