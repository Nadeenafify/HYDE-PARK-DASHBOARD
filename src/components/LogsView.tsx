import { useEffect, useMemo, useState } from 'react'
import {
  ClipboardList,
  Building2,
  Users,
  LogIn,
  Database,
  Activity,
  Search,
} from 'lucide-react'
import type { ActivityLog } from '../types'
import { SectionCard, Pagination } from './ui'
import { usePagination } from '../hooks/usePagination'
import { formatDateTime } from '../lib/utils'
import { api } from '../lib/api'

const CAT: Record<
  string,
  { label: string; icon: typeof ClipboardList; chip: string }
> = {
  booking: { label: 'Bookings', icon: ClipboardList, chip: 'bg-brand-50 text-brand-600' },
  unit: { label: 'Units', icon: Building2, chip: 'bg-sky-50 text-sky-600' },
  user: { label: 'Users', icon: Users, chip: 'bg-indigo-50 text-indigo-600' },
  auth: { label: 'Sign-ins', icon: LogIn, chip: 'bg-slate-100 text-slate-500' },
  backup: { label: 'Data', icon: Database, chip: 'bg-amber-50 text-amber-600' },
}

const FALLBACK = { label: 'Other', icon: Activity, chip: 'bg-slate-100 text-slate-500' }

function catOf(action: string): string {
  return action.split('.')[0]
}

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'booking', label: 'Bookings' },
  { key: 'unit', label: 'Units' },
  { key: 'user', label: 'Users' },
  { key: 'auth', label: 'Sign-ins' },
  { key: 'backup', label: 'Data' },
]

export function LogsView() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    api
      .listLogs()
      .then((l) => active && setLogs(l))
      .catch(
        (e) =>
          active && setError(e instanceof Error ? e.message : 'Failed to load logs.'),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return logs.filter((l) => {
      if (filter !== 'all' && catOf(l.action) !== filter) return false
      if (!q) return true
      return (
        l.description.toLowerCase().includes(q) ||
        (l.userName ?? '').toLowerCase().includes(q)
      )
    })
  }, [logs, filter, query])

  const { pageItems, page, pageSize, total, totalPages, start, setPage, setPageSize } =
    usePagination(filtered, 20)

  useEffect(() => {
    setPage(1)
  }, [filter, query, setPage])

  return (
    <SectionCard
      title={`Activity log (${logs.length})`}
      action={
        <div className="group relative w-44 sm:w-56">
          <Search
            size={15}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-600"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activity…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
          />
        </div>
      }
    >
      <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-5 py-3">
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                active
                  ? 'bg-linear-to-r from-slate-900 to-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className="px-5 py-16 text-center text-sm text-slate-400">Loading…</p>
      ) : error ? (
        <p className="px-5 py-16 text-center text-sm text-rose-600">{error}</p>
      ) : total === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
          <Activity className="text-slate-300" size={26} />
          <p className="text-sm text-slate-500">No activity yet.</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-50">
            {pageItems.map((l) => {
              const c = CAT[catOf(l.action)] ?? FALLBACK
              const Icon = c.icon
              return (
                <li key={l.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${c.chip}`}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800">{l.description}</p>
                    <p className="text-xs text-slate-400">
                      {l.userName ?? 'System'}
                      <span className="sm:hidden"> · {formatDateTime(l.createdAt)}</span>
                    </p>
                  </div>
                  <span className="hidden shrink-0 whitespace-nowrap text-xs text-slate-400 sm:block">
                    {formatDateTime(l.createdAt)}
                  </span>
                </li>
              )
            })}
          </ul>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            start={start}
            pageSizes={[20, 50, 100]}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            noun="entries"
          />
        </>
      )}
    </SectionCard>
  )
}
