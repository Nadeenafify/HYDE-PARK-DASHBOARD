import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Phone, Search, Clock } from 'lucide-react'
import type { Booking, BlockEvent } from '../types'
import { SectionCard, Pagination } from './ui'
import { usePagination } from '../hooks/usePagination'
import { useToast } from './Toast'
import { formatDateTime, formatMobile } from '../lib/utils'
import { api } from '../lib/api'

/** Initials from a free-form customer name; "—" when unknown. */
function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? '')
  return (a + b).toUpperCase() || '—'
}

export function BlockedView({
  bookings,
  onUnblock,
}: {
  bookings: Booking[]
  onUnblock: (mobile: string) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [busyMobile, setBusyMobile] = useState<string | null>(null)
  // Audit events only enrich "blocked by / since" — the blocked list itself
  // comes from the live booking flags, so it always matches the Bookings badge.
  const [events, setEvents] = useState<BlockEvent[]>([])
  const toast = useToast()

  useEffect(() => {
    let active = true
    api
      .getBlockEvents()
      .then((e) => active && setEvents(e))
      .catch(() => undefined) // enrichment is best-effort
    return () => {
      active = false
    }
  }, [])

  // Source of truth: every customer whose bookings are currently flagged
  // blocked, one row per mobile.
  const blockedNow = useMemo(() => {
    const byMobile = new Map<string, { mobile: string; name: string }>()
    for (const b of bookings) {
      if (!b.blocked || byMobile.has(b.mobile)) continue
      byMobile.set(b.mobile, {
        mobile: b.mobile,
        name: `${b.firstName} ${b.lastName}`.trim() || 'Unknown',
      })
    }
    return [...byMobile.values()]
  }, [bookings])

  // Latest *block* action per mobile → who blocked them and when (if recorded).
  const blockInfo = useMemo(() => {
    const m = new Map<string, BlockEvent>()
    for (const e of events) if (e.blocked && !m.has(e.mobile)) m.set(e.mobile, e)
    return m
  }, [events])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return blockedNow
    return blockedNow.filter(
      (r) =>
        r.mobile.toLowerCase().includes(q) || r.name.toLowerCase().includes(q),
    )
  }, [blockedNow, query])

  const { pageItems, page, pageSize, total, totalPages, start, setPage, setPageSize } =
    usePagination(filtered, 20)

  useEffect(() => {
    setPage(1)
  }, [query, setPage])

  async function handleUnblock(mobile: string) {
    setBusyMobile(mobile)
    try {
      await onUnblock(mobile)
      toast.success(`Unblocked ${formatMobile(mobile)}.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to unblock.')
    } finally {
      setBusyMobile(null)
    }
  }

  return (
    <SectionCard
      title={`Blocked customers (${blockedNow.length})`}
      action={
        <div className="group relative w-full sm:w-56">
          <Search
            size={15}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-600"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number or name…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
          />
        </div>
      }
    >
      {total === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-400">
            <ShieldCheck size={24} />
          </span>
          <p className="text-sm text-slate-500">
            {blockedNow.length === 0
              ? 'No customers are blocked right now.'
              : 'No blocked customers match your search.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop / tablet: full table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-170 text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-3 py-3">Mobile</th>
                  <th className="px-3 py-3">Blocked by</th>
                  <th className="px-3 py-3">Since</th>
                  <th className="px-5 py-3 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pageItems.map((r) => {
                  const busy = busyMobile === r.mobile
                  const info = blockInfo.get(r.mobile)
                  return (
                    <tr key={r.mobile} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-rose-500 to-rose-700 text-[10px] font-semibold text-white">
                            {nameInitials(r.name)}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {r.name}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <Phone size={13} className="text-slate-400" />
                          {formatMobile(r.mobile)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-slate-600">
                        {info?.actorName ?? '—'}
                      </td>
                      <td className="px-3 py-3.5">
                        {info ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-400">
                            <Clock size={12} />
                            {formatDateTime(info.createdAt)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleUnblock(r.mobile)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ShieldCheck size={13} />
                          {busy ? 'Unblocking…' : 'Unblock'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: each blocked customer collapses into a stacked card */}
          <div className="divide-y divide-slate-100 md:hidden">
            {pageItems.map((r) => {
              const busy = busyMobile === r.mobile
              const info = blockInfo.get(r.mobile)
              return (
                <div key={r.mobile} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-rose-500 to-rose-700 text-[10px] font-semibold text-white">
                        {nameInitials(r.name)}
                      </span>
                      <span className="truncate font-semibold text-slate-800">
                        {r.name}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUnblock(r.mobile)}
                      disabled={busy}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <ShieldCheck size={13} />
                      {busy ? 'Unblocking…' : 'Unblock'}
                    </button>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-slate-400">
                        Mobile
                      </dt>
                      <dd className="mt-0.5">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <Phone size={13} className="text-slate-400" />
                          {formatMobile(r.mobile)}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-slate-400">
                        Blocked by
                      </dt>
                      <dd className="mt-0.5 text-slate-600">
                        {info?.actorName ?? '—'}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[11px] uppercase tracking-wide text-slate-400">
                        Since
                      </dt>
                      <dd className="mt-0.5">
                        {info ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-400">
                            <Clock size={12} />
                            {formatDateTime(info.createdAt)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              )
            })}
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
            noun="customers"
          />
        </>
      )}
    </SectionCard>
  )
}
