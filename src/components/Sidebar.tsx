import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Building2,
  X,
} from 'lucide-react'
import { Logo } from './ui'
import type { HealthState } from '../hooks/useDashboard'

export type View = 'overview' | 'bookings' | 'schedule' | 'units'

const NAV: { id: View; label: string; sub: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', sub: 'الرئيسية', icon: LayoutDashboard },
  { id: 'bookings', label: 'Bookings', sub: 'الحجوزات', icon: ClipboardList },
  { id: 'schedule', label: 'Schedule', sub: 'جدول التركيب', icon: CalendarDays },
  { id: 'units', label: 'Units', sub: 'الوحدات', icon: Building2 },
]

const HEALTH_META: Record<HealthState, { dot: string; ring: string; label: string }> = {
  checking: {
    dot: 'bg-slate-300 animate-pulse',
    ring: 'bg-slate-200',
    label: 'Connecting…',
  },
  ok: { dot: 'bg-emerald-500', ring: 'bg-emerald-400/30', label: 'API connected' },
  down: { dot: 'bg-rose-500', ring: 'bg-rose-400/30', label: 'API offline' },
}

export function Sidebar({
  view,
  onChange,
  health,
  open = false,
  onClose,
}: {
  view: View
  onChange: (v: View) => void
  health: HealthState
  /** Whether the off-canvas drawer is open (mobile only). */
  open?: boolean
  onClose?: () => void
}) {
  const h = HEALTH_META[health]
  return (
    <>
      {/* Mobile overlay — tap to dismiss */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 transform flex-col border-r border-slate-200/70 bg-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-6 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-slate-50 to-slate-100 ring-1 ring-slate-200/70">
            <Logo className="h-7 w-7" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide text-slate-800">
              HYDE PARK
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
              Developments
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4">
          <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-brand-600 to-brand-800 px-4 py-3 shadow-soft">
            <span className="pointer-events-none absolute -right-4 -top-6 h-16 w-16 rounded-full bg-white/10" />
            <span className="pointer-events-none absolute -bottom-5 -left-3 h-12 w-12 rounded-full bg-white/5" />
            <p className="relative text-xs font-semibold tracking-wide text-white">
              HPD Triple Play
            </p>
            <p className="relative text-[11px] text-brand-100/90">
              Bookings dashboard
            </p>
          </div>
        </div>

        <nav className="mt-5 flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = view === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item.id)
                  onClose?.()
                }}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 ${
                  active
                    ? 'bg-linear-to-r from-slate-900 to-slate-800 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                {/* Active accent bar */}
                <span
                  className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-400 transition-all duration-200 ${
                    active ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <Icon
                  size={18}
                  className={
                    active
                      ? 'text-brand-300'
                      : 'text-slate-400 transition-colors group-hover:text-slate-600'
                  }
                />
                <span className="flex-1 font-medium">{item.label}</span>
                <span
                  className={`text-[11px] ${active ? 'text-white/60' : 'text-slate-400'}`}
                >
                  {item.sub}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="border-t border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${h.ring} ${
                  health === 'ok' ? 'animate-ping' : ''
                }`}
              />
              <span className={`relative h-2 w-2 rounded-full ${h.dot}`} />
            </span>
            <span className="text-xs font-medium text-slate-600">{h.label}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Form ID 233577430439562</p>
        </div>
      </aside>
    </>
  )
}
