import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { BookingStatus } from '../types'
import { STATUS_META, initials } from '../lib/utils'

/** Hyde Park Developments "H" monogram — transparent PNG served from /public. */
export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <img
      src="/HYDAPARK.png"
      alt="Hyde Park Developments"
      className={`object-contain ${className}`}
    />
  )
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

export function Avatar({
  firstName,
  lastName,
}: {
  firstName: string
  lastName: string
}) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white shadow-sm ring-1 ring-white/40">
      {initials(firstName, lastName)}
    </span>
  )
}

/** Color tones for stat cards — drives the icon tile + accent line. */
export type StatTone = 'slate' | 'amber' | 'brand' | 'emerald' | 'sky' | 'rose'

const TONES: Record<
  StatTone,
  { tile: string; icon: string; bar: string }
> = {
  slate: {
    tile: 'bg-slate-100 text-slate-600',
    icon: 'text-slate-500',
    bar: 'from-slate-300 to-slate-400',
  },
  amber: {
    tile: 'bg-amber-100 text-amber-600',
    icon: 'text-amber-500',
    bar: 'from-amber-300 to-amber-500',
  },
  brand: {
    tile: 'bg-brand-100 text-brand-700',
    icon: 'text-brand-600',
    bar: 'from-brand-400 to-brand-600',
  },
  emerald: {
    tile: 'bg-emerald-100 text-emerald-600',
    icon: 'text-emerald-500',
    bar: 'from-emerald-300 to-emerald-500',
  },
  sky: {
    tile: 'bg-sky-100 text-sky-600',
    icon: 'text-sky-500',
    bar: 'from-sky-300 to-sky-500',
  },
  rose: {
    tile: 'bg-rose-100 text-rose-600',
    icon: 'text-rose-500',
    bar: 'from-rose-300 to-rose-500',
  },
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'slate',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: ReactNode
  tone?: StatTone
}) {
  const t = TONES[tone]
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-card">
      {/* Top accent line, revealed on hover */}
      <span
        className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${t.bar} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
      />
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.tile} transition-transform duration-300 group-hover:scale-110`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-4 truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </p>
      {hint != null && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function SectionCard({
  title,
  action,
  children,
  className = '',
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft ${className}`}
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-slate-800">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  )
}

/**
 * Footer with a "showing X–Y of N" range, a rows-per-page selector and
 * prev/next controls. Pair with the `usePagination` hook — pass its values in.
 */
export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  start,
  pageSizes = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
  noun = 'items',
  topBorder = true,
}: {
  page: number
  pageSize: number
  total: number
  totalPages: number
  start: number
  pageSizes?: number[]
  onPageChange: (p: number) => void
  onPageSizeChange: (n: number) => void
  noun?: string
  topBorder?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-between gap-3 px-5 py-3 text-xs text-slate-500 sm:flex-row ${
        topBorder ? 'border-t border-slate-100' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span>
          {total === 0
            ? `No ${noun}`
            : `Showing ${start + 1}–${Math.min(start + pageSize, total)} of ${total}`}
        </span>
        <label className="flex items-center gap-1.5">
          <span className="text-slate-400">Rows</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          >
            {pageSizes.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="px-2 text-slate-500">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
