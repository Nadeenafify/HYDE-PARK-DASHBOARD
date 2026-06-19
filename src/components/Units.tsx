import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Plus, CheckCircle2, Search, Upload } from 'lucide-react'
import type { Unit } from '../types'
import { SectionCard, Pagination } from './ui'
import { useToast } from './Toast'
import { usePagination } from '../hooks/usePagination'

type BookedFilter = 'all' | 'available' | 'booked'

// Tolerant header matching so common English/Arabic column names all work.
const CODE_KEYS = [
  'code', 'unit', 'unit number', 'unitnumber', 'unit_code', 'unit code',
  'رقم الوحدة', 'الوحدة', 'الوحده', 'رقم',
]
const DESC_KEYS = [
  'description', 'type', 'desc', 'نوع', 'النوع', 'الوصف', 'وصف',
]

function norm(v: unknown): string {
  return String(v ?? '').trim().toLowerCase()
}

/**
 * Parse an .xlsx/.csv into unit rows. Works with or without a header row:
 * if the first row looks like headers we map by column name, otherwise the
 * first column is the code and the second (if any) is the description.
 */
async function parseUnitsFile(
  file: File,
): Promise<{ code: string; description?: string }[]> {
  // Lazy-load SheetJS only when an import actually happens (keeps the main
  // bundle small).
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
  })
  if (!rows.length) return []

  const first = (rows[0] as unknown[]).map((c) => norm(c))
  const hasHeader = first.some(
    (c) => CODE_KEYS.includes(c) || DESC_KEYS.includes(c),
  )

  let codeIdx = 0
  let descIdx = 1
  let dataRows = rows
  if (hasHeader) {
    const ci = first.findIndex((c) => CODE_KEYS.includes(c))
    const di = first.findIndex((c) => DESC_KEYS.includes(c))
    codeIdx = ci >= 0 ? ci : 0
    descIdx = di
    dataRows = rows.slice(1)
  }

  const out: { code: string; description?: string }[] = []
  for (const r of dataRows) {
    const arr = r as unknown[]
    const code = String(arr[codeIdx] ?? '').trim()
    if (!code) continue
    const description = descIdx >= 0 ? String(arr[descIdx] ?? '').trim() : ''
    out.push({ code, description: description || undefined })
  }
  return out
}

const BOOKED_FILTERS: { key: BookedFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'booked', label: 'Booked' },
]

export function Units({
  units,
  onAdd,
  onImport,
  canManage,
}: {
  units: Unit[]
  onAdd: (payload: { unitNumber: string; type?: string; owner?: string }) => Promise<void>
  onImport: (
    units: { code: string; description?: string }[],
  ) => Promise<{ created: number; skipped: number; total: number }>
  /** Only Super Admins can add or import units. */
  canManage: boolean
}) {
  const [unitNumber, setUnitNumber] = useState('')
  const [type, setType] = useState('')
  const [owner, setOwner] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toast = useToast()

  // Excel import
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    setImporting(true)
    try {
      const rows = await parseUnitsFile(file)
      if (rows.length === 0) {
        toast.error('No unit codes found in the file.')
        return
      }
      const result = await onImport(rows)
      toast.success(
        `Imported ${result.created} unit${result.created === 1 ? '' : 's'}${
          result.skipped ? `, skipped ${result.skipped} (duplicate/empty)` : ''
        }.`,
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

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
      toast.success('Unit added')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add unit.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={canManage ? 'grid grid-cols-1 gap-6 lg:grid-cols-3' : ''}>
      <SectionCard
        title={`Units (${units.length})`}
        className={canManage ? 'lg:col-span-2' : ''}
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
                  className="group flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-slate-50/80"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br shadow-sm transition group-hover:scale-105 ${
                      u.booked
                        ? 'from-brand-500 to-brand-700 text-white'
                        : 'from-slate-100 to-slate-200 text-slate-500'
                    }`}
                  >
                    <Building2 size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">
                      {u.unitNumber}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {[u.type, u.owner].filter(Boolean).join(' · ') || 'No type set'}
                    </p>
                  </div>
                  {u.booked ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <CheckCircle2 size={12} /> Booked
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
                      Available
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

      {canManage && (
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

        <div className="border-t border-slate-100 px-5 py-4">
          <p className="mb-2 text-xs font-medium text-slate-500">
            Or import many at once
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload size={16} /> {importing ? 'Importing…' : 'Import from Excel'}
          </button>
          <p className="mt-2 text-[11px] text-slate-400">
            .xlsx / .csv — a column of unit codes (optional “type” column).
            Duplicates are skipped.
          </p>
        </div>
      </SectionCard>
      )}
    </div>
  )
}
