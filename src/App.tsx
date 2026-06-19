import { useMemo, useState } from 'react'
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  FlaskConical,
  LogOut,
  Menu,
} from 'lucide-react'
import { BOOKINGS } from './data/bookings'
import { useDashboard } from './hooks/useDashboard'
import { useAuth } from './hooks/useAuth'
import { Sidebar, type View } from './components/Sidebar'
import { LoginPage } from './components/LoginPage'
import { Overview } from './components/Overview'
import { BookingsTable } from './components/BookingsTable'
import { Schedule } from './components/Schedule'
import { Units } from './components/Units'
import { BookingDetail } from './components/BookingDetail'
import { DataTools } from './components/DataTools'
import { UsersAdmin } from './components/UsersAdmin'
import { LogsView } from './components/LogsView'
import { useToast } from './components/Toast'
import type { AppUser } from './types'
import { ROLE_LABELS } from './types'

const VIEW_META: Record<View, { title: string; subtitle: string }> = {
  overview: { title: 'Overview', subtitle: 'HPD Triple Play bookings at a glance' },
  bookings: { title: 'Bookings', subtitle: 'All form submissions' },
  schedule: { title: 'Schedule', subtitle: 'Upcoming installation appointments' },
  units: { title: 'Units', subtitle: 'Registered units' },
  users: { title: 'Users', subtitle: 'Accounts & roles' },
  logs: { title: 'Logs', subtitle: 'Who did what, and when' },
}

function Dashboard({
  onLogout,
  currentUser,
}: {
  onLogout: () => void
  currentUser: AppUser | null
}) {
  const [view, setView] = useState<View>('overview')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const {
    bookings,
    units,
    health,
    loading,
    error,
    reload,
    updateStatus,
    postpone,
    addUnit,
    importUnits,
    restore,
    loadDemo,
  } = useDashboard()

  const selected = useMemo(
    () => bookings.find((b) => b.id === selectedId) ?? null,
    [bookings, selectedId],
  )

  const toast = useToast()

  function handleStatus(id: string, status: Parameters<typeof updateStatus>[1]) {
    updateStatus(id, status)
      .then(() => toast.success('Booking status updated'))
      .catch(() => toast.error('Could not update status'))
  }

  async function handlePostpone(id: string, date: string, time: string) {
    try {
      await postpone(id, date, time)
      toast.success('Booking postponed')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not postpone booking')
      throw e
    }
  }

  const role = currentUser?.role
  const canManageBookings = role === 'manager' || role === 'super_admin'
  const isSuperAdmin = role === 'super_admin'
  const avatarText = currentUser?.name
    ? currentUser.name
        .trim()
        .split(/\s+/)
        .map((s) => s[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'HP'

  const meta = VIEW_META[view]

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Ambient background wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_85%_-10%,rgba(20,165,150,0.10),transparent),radial-gradient(50rem_30rem_at_-10%_110%,rgba(99,102,241,0.06),transparent)]"
      />
      <Sidebar
        view={view}
        onChange={setView}
        health={health}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isSuperAdmin={isSuperAdmin}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200/70 bg-white/80 px-4 py-3.5 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {meta.title}
              </h1>
              <p className="hidden truncate text-sm text-slate-500 sm:block">
                {meta.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => void reload()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 sm:px-3"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:px-3"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-sm font-semibold text-slate-800">
                  {currentUser?.name ?? '—'}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {role ? ROLE_LABELS[role] : ''}
                </p>
              </div>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-slate-800 to-slate-950 text-sm font-semibold text-white shadow-sm ring-1 ring-white/10"
                title={currentUser?.email ?? ''}
              >
                {avatarText}
              </span>
            </div>
          </div>
        </header>

        <main
          key={view}
          className="animate-rise flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-32 text-slate-400">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70">
                <Loader2 className="animate-spin text-brand-600" size={26} />
              </span>
              <p className="text-sm font-medium">Loading bookings…</p>
            </div>
          ) : error ? (
            <div className="animate-rise mx-auto max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-card">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-100">
                <AlertTriangle className="text-rose-500" size={24} />
              </span>
              <p className="mt-3 font-semibold text-rose-800">
                Couldn’t load data
              </p>
              <p className="mt-1 text-sm text-rose-600">{error}</p>
              <div className="mt-5 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void reload()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500"
                >
                  <RefreshCw size={15} /> Retry
                </button>
                <button
                  type="button"
                  onClick={() => loadDemo(BOOKINGS)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  <FlaskConical size={15} /> Preview with demo data
                </button>
              </div>
            </div>
          ) : (
            <>
              {view === 'overview' && (
                <>
                  <Overview bookings={bookings} onSelect={(b) => setSelectedId(b.id)} />
                  {isSuperAdmin && (
                    <DataTools bookings={bookings} onRestore={restore} />
                  )}
                </>
              )}
              {view === 'bookings' && (
                <BookingsTable
                  bookings={bookings}
                  onSelect={(b) => setSelectedId(b.id)}
                />
              )}
              {view === 'schedule' && (
                <Schedule bookings={bookings} onSelect={(b) => setSelectedId(b.id)} />
              )}
              {view === 'units' && (
                <Units
                  units={units}
                  onAdd={addUnit}
                  onImport={importUnits}
                  canManage={isSuperAdmin}
                />
              )}
              {view === 'users' && isSuperAdmin && (
                <UsersAdmin currentUserId={currentUser?.id} />
              )}
              {view === 'logs' && isSuperAdmin && <LogsView />}
            </>
          )}
        </main>
      </div>

      <BookingDetail
        key={selected?.id}
        booking={selected}
        onClose={() => setSelectedId(null)}
        onStatusChange={handleStatus}
        onPostpone={handlePostpone}
        canManage={canManageBookings}
      />
    </div>
  )
}

/**
 * Auth gate: the dashboard is admin-only. Without a valid session we show the
 * login screen; once authenticated the JWT is attached to every API request.
 */
function App() {
  const { isAuthenticated, currentUser, login, logout } = useAuth()

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />
  }

  return <Dashboard onLogout={logout} currentUser={currentUser} />
}

export default App
