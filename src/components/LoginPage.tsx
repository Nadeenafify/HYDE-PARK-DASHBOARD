import { useState, type FormEvent } from 'react'
import { Loader2, Lock, User, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { Logo } from './ui'

/**
 * Admin login screen. On submit it calls onLogin(username, password); the
 * parent (App) persists the returned token and swaps in the dashboard.
 */
export function LoginPage({
  onLogin,
}: {
  onLogin: (username: string, password: string) => Promise<void>
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      await onLogin(username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-slate-900 via-slate-900 to-brand-950 px-4">
      {/* Decorative ambient blobs */}
      <div
        aria-hidden="true"
        className="animate-float pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-brand-500/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="animate-float pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl"
        style={{ animationDelay: '4s' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_30rem_at_50%_-10%,rgba(20,165,150,0.18),transparent)]"
      />

      <div className="animate-rise relative w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 shadow-pop ring-1 ring-white/20 backdrop-blur">
            <Logo className="h-10 w-10" />
          </span>
          <p className="mt-4 text-base font-bold tracking-wide text-white">
            HYDE PARK
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-brand-200/80">
            Developments
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/15 bg-white/95 p-7 shadow-pop backdrop-blur-xl"
        >
          <div className="mb-6 text-center">
            <h1 className="text-lg font-bold text-slate-900">Admin sign in</h1>
            <p className="mt-1 text-sm text-slate-500">
              HPD Triple Play bookings dashboard
            </p>
          </div>

          {error && (
            <div className="animate-rise mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Email
            </span>
            <div className="group relative">
              <User
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-600"
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 disabled:opacity-60"
                placeholder="admin@gmail.com"
              />
            </div>
          </label>

          <label className="mb-6 block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </span>
            <div className="group relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-600"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-10 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 disabled:opacity-60"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand-600 to-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:from-brand-500 hover:to-brand-600 hover:shadow-brand-600/35 active:scale-[0.99] disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          © Hyde Park Developments · Secure admin access
        </p>
      </div>
    </div>
  )
}
