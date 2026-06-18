import { useEffect, useMemo, useState } from 'react'
import { Building2, Plus, CheckCircle2, Search } from 'lucide-react'
import type { Unit } from '../types'
import { SectionCard, Pagination } from './ui'
import { usePagination } from '../hooks/usePagination'

type BookedFilter = 'all' | 'available' | 'booked'

const BOOKED_FILTERS: { key: BookedFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'booked', label: 'Booked' },
]

export function Units({
  units,
  onAdd,
}: {
  units: Unit[]
  onAdd: (payload: { unitNumber: string; type?: string; owner?: string }) => Promise<void>
}) {
  const [unitNumber, setUnitNumber] = useState('')
  const [type, setType] = useState('')
  const [owner, setOwner] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // List filters
  const [query, setQuery] = useState('')
  const [bookedFilter, setBookedFilter] = useState<BookedFilter>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return units.filter((u) => {
      if (bookedFilter === 'booked' && !u.booked) return false
      if (bookedFilter === 'available' && u.booked) return false
      if (!q) return true
      return (
        u.unitNumber.toLowerCase().includes(q) ||
        (u.type ?? '').toLowerCase().includes(q) ||
        (u.owner ?? '').toLowerCase().includes(q)
      )
    })
  }, [units, query, bookedFilter])

  const { pageItems, page, pageSize, total, totalPages, start, setPage, setPageSize } =
    usePagination(filtered)

  // Jump back to the first page whenever the filters change.
  useEffect(() => {
    setPage(1)
  }, [query, bookedFilter, setPage])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!unitNumber.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onAdd({
        unitNumber: unitNumber.trim(),
        type: type.trim() || undefined,
        owner: owner.trim() || undefined,
      })
      setUnitNumber('')
      setType('')
      setOwner('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add unit.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <SectionCard
        title={`Units (${units.length})`}
        className="lg:col-span-2"
        action={
          <div className="group relative w-44 sm:w-56">
            <Search
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-600"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search units…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
            />
          </div>
        }
      >
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-5 py-3">
          {BOOKED_FILTERS.map((f) => {
            const active = bookedFilter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setBookedFilter(f.key)}
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

        {total === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <Building2 className="text-slate-300" size={28} />
            <p className="text-sm text-slate-500">
              {units.length === 0
                ? 'No units yet. Add one →'
                : 'No units match your filters.'}
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-50">
              {pageItems.map((u) => (
                <li
                  key={u.id}
                  className="group flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50/80"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                      u.booked
                        ? 'bg-brand-100 text-brand-600'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                    }`}
                  >
                    <Building2 size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">
                      {u.unitNumber}
                    </p>
                    <p className="text-xs text-slate-400">
                      {[u.type, u.owner].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  {u.booked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-600/20">
                      <CheckCircle2 size={13} /> Booked
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              start={start}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              noun="units"
            />
          </>
        )}
      </SectionCard>

      <SectionCard title="Add unit">
        <form onSubmit={submit} className="space-y-3 px-5 py-5">
          <div>
            <label className="text-xs font-medium text-slate-500">
              Unit number *
            </label>
            <input
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="PK1-A-0312"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Type</label>
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Apartment / Villa"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Owner</label>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Owner name"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
            />
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={saving || !unitNumber.trim()}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-brand-600 to-brand-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:from-brand-500 hover:to-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
          >
            <Plus size={16} /> {saving ? 'Adding…' : 'Add unit'}
          </button>
        </form>
      </SectionCard>
    </div>
  )
}
