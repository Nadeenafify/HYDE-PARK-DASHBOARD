import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { FileImage, FileX2, ChevronDown, Ban } from 'lucide-react'
import type { Booking, BookingStatus, UnitType } from '../types'
import { STATUSES, UNIT_TYPE_LABELS } from '../types'
import {
  fullName,
  formatDate,
  formatMobile,
  isToday,
  STATUS_META,
} from '../lib/utils'
import {
  Avatar,
  StatusBadge,
  UnitTypeBadge,
  Pagination,
  SearchInput,
  FilterChips,
  type FilterOption,
} from './ui'
import { usePagination } from '../hooks/usePagination'

type StatusFilter = BookingStatus | 'all'
type TypeFilter = UnitType | 'all'
const TYPE_FILTERS: TypeFilter[] = ['all', 'residential', 'commercial']

/** Accent dot for a unit-type pill (matches UnitTypeBadge tones). */
const TYPE_DOT: Record<TypeFilter, string | undefined> = {
  all: undefined,
  residential: 'bg-sky-500',
  commercial: 'bg-violet-500',
}

export function BookingsTable({
  bookings,
  onSelect,
}: {
  bookings: Booking[]
  onSelect: (b: Booking) => void
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: bookings.length,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    }
    for (const b of bookings) c[b.status]++
    return c
  }, [bookings])

  const typeCounts = useMemo(() => {
    const c: Record<TypeFilter, number> = {
      all: bookings.length,
      residential: 0,
      commercial: 0,
    }
    for (const b of bookings) {
      if (b.unitType === 'residential') c.residential++
      else if (b.unitType === 'commercial') c.commercial++
    }
    return c
  }, [bookings])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bookings
      .filter((b) => statusFilter === 'all' || b.status === statusFilter)
      .filter((b) => typeFilter === 'all' || b.unitType === typeFilter)
      .filter((b) => {
        if (!q) return true
        return (
          b.unitNumber.toLowerCase().includes(q) ||
          fullName(b.firstName, b.lastName).toLowerCase().includes(q) ||
          b.mobile.includes(q) ||
          b.id.includes(q)
        )
      })
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  }, [bookings, query, statusFilter, typeFilter])

  const { pageItems, page, pageSize, total, totalPages, start, setPage, setPageSize } =
    usePagination(filtered)

  // Jump back to the first page whenever the filters change.
  useEffect(() => {
    setPage(1)
  }, [query, statusFilter, typeFilter, setPage])

  const statusOptions: FilterOption<StatusFilter>[] = (
    ['all', ...STATUSES] as StatusFilter[]
  ).map((s) => ({
    key: s,
    label: s === 'all' ? 'All' : STATUS_META[s].label,
    count: counts[s],
    dot: s === 'all' ? undefined : STATUS_META[s].dot,
  }))

  const typeOptions: FilterOption<TypeFilter>[] = TYPE_FILTERS.map((t) => ({
    key: t,
    label: t === 'all' ? 'All' : UNIT_TYPE_LABELS[t].en,
    count: typeCounts[t],
    dot: TYPE_DOT[t],
  }))

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft">
      <div className="flex flex-col gap-3.5 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search unit, name, mobile…"
          className="w-full lg:max-w-xs"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
          <FilterChips
            label="Status"
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <FilterChips
            label="Type"
            options={typeOptions}
            value={typeFilter}
            onChange={setTypeFilter}
          />
        </div>
      </div>

      {/* Desktop / tablet: full table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-semibold">Owner / Unit</th>
              <th className="px-5 py-3 font-semibold">Mobile</th>
              <th className="px-5 py-3 font-semibold">Installation</th>
              <th className="px-5 py-3 font-semibold">Receipt</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((b) => (
              <tr
                key={b.id}
                onClick={() => onSelect(b)}
                className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-brand-50/40"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar firstName={b.firstName} lastName={b.lastName} />
                    <div>
                      <p className="flex items-center gap-1.5 font-medium text-slate-800">
                        {fullName(b.firstName, b.lastName)}
                        {b.blocked && <BlockedChip />}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-slate-400">
                    {b.unitNumber}
                    <UnitTypeBadge type={b.unitType} />
                  </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {formatMobile(b.mobile)}
                </td>
                <td className="px-5 py-3">
                  <InstallationCell
                    installationDate={b.installationDate}
                    timeSlot={b.timeSlot}
                  />
                </td>
                <td className="px-5 py-3">
                  <ReceiptTag receiptUrl={b.receiptUrl} />
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={b.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: each booking collapses into a stacked card */}
      <div className="divide-y divide-slate-100 md:hidden">
        {pageItems.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b)}
            className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-brand-50/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar firstName={b.firstName} lastName={b.lastName} />
                <div>
                  <p className="flex items-center gap-1.5 font-medium text-slate-800">
                    {fullName(b.firstName, b.lastName)}
                    {b.blocked && <BlockedChip />}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-slate-400">
                    {b.unitNumber}
                    <UnitTypeBadge type={b.unitType} />
                  </p>
                </div>
              </div>
              <StatusBadge status={b.status} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pl-12 text-sm">
              <Field label="Mobile">
                <span className="text-slate-700">{formatMobile(b.mobile)}</span>
              </Field>
              <Field label="Receipt">
                <ReceiptTag receiptUrl={b.receiptUrl} />
              </Field>
              <Field label="Installation" wide>
                <InstallationCell
                  installationDate={b.installationDate}
                  timeSlot={b.timeSlot}
                />
              </Field>
            </dl>
          </button>
        ))}
      </div>

      {total === 0 && (
        <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
          <ChevronDown className="text-slate-300" />
          <p className="text-sm text-slate-500">No bookings match your filters.</p>
        </div>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        start={start}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        noun="bookings"
      />
    </div>
  )
}

/** Small "Blocked" pill shown next to a barred customer's name. */
function BlockedChip() {
  return (
    <span
      title="Blocked from online booking"
      className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 ring-1 ring-inset ring-rose-200"
    >
      <Ban size={10} /> Blocked
    </span>
  )
}

/** Installation date + time slot, with a "TODAY" pill. Shared by table + cards. */
function InstallationCell({
  installationDate,
  timeSlot,
}: {
  installationDate: string
  timeSlot: string
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-slate-700">{formatDate(installationDate)}</span>
        {isToday(installationDate) && (
          <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-brand-700 ring-1 ring-inset ring-brand-200">
            TODAY
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400">{timeSlot}</p>
    </>
  )
}

/** "Attached" / "Missing" receipt indicator. Shared by table + cards. */
function ReceiptTag({ receiptUrl }: { receiptUrl: string | null }) {
  return receiptUrl ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
      <FileImage size={14} /> Attached
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-rose-500">
      <FileX2 size={14} /> Missing
    </span>
  )
}

/** Labelled field used inside the mobile card layout. */
function Field({
  label,
  children,
  wide = false,
}: {
  label: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  )
}
