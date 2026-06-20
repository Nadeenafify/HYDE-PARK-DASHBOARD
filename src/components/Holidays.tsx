import { useEffect, useState } from 'react'
import { CalendarOff, Plus, Trash2, CalendarDays } from 'lucide-react'
import type { ClosedDay } from '../types'
import { api } from '../lib/api'
import { formatDate } from '../lib/utils'
import { SectionCard } from './ui'
import { useToast } from './Toast'

export function Holidays({ canManage }: { canManage: boolean }) {
  const [days, setDays] = useState<ClosedDay[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const toast = useToast()
  const todayISO = new Date().toISOString().slice(0, 10)

  async function load() {
    setLoading(true)
    try {
      setDays(await api.getClosedDays())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load closed days.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!date) return
    setSaving(true)
    setError(null)
    try {
      const created = await api.addClosedDay(date, reason.trim() || undefined)
      setDays((prev) =>
        [...prev, created].sort((a, b) => a.date.localeCompare(b.date)),
      )
      setDate('')
      setReason('')
      toast.success('Day marked as closed')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add closed day.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setDeletingId(id)
    const snapshot = days
    setDays((prev) => prev.filter((d) => d.id !== id))
    try {
      await api.deleteClosedDay(id)
      toast.success('Day reopened')
    } catch (err) {
      setDays(snapshot) // revert
      toast.error(err instanceof Error ? err.message : 'Could not remove day.')
    } finally {
      setDeletingId(null)
    }
  }

  // Past closed days are no longer relevant — show upcoming first.
  const upcoming = days.filter((d) => d.date >= todayISO)
  const past = days.filter((d) => d.date < todayISO)

  return (
    <div className={canManage ? 'grid grid-cols-1 gap-6 lg:grid-cols-3' : ''}>
      <SectionCard
        title={`Closed days (${upcoming.length} upcoming)`}
        className={canManage ? 'lg:col-span-2' : ''}
      >
        {loading ? (
          <div className="px-5 py-16 text-center text-sm text-slate-400">
            Loading…
          </div>
        ) : days.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <CalendarOff className="text-slate-300" size={28} />
            <p className="text-sm text-slate-500">
              No closed days yet.{canManage ? ' Add one →' : ''}
            </p>
            <p className="text-xs text-slate-400">
              Fridays, Saturdays &amp; national holidays are always closed automatically.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {[...upcoming, ...past].map((d) => {
              const isPast = d.date < todayISO
              return (
                <li
                  key={d.id}
                  className={`group flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-slate-50/80 ${
                    isPast ? 'opacity-50' : ''
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-rose-500 to-rose-700 text-white shadow-sm">
                    <CalendarOff size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">
                      {formatDate(d.date)}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {d.reason || 'Closed'}
                    </p>
                  </div>
                  {isPast && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400 ring-1 ring-inset ring-slate-200">
                      Past
                    </span>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => remove(d.id)}
                      disabled={deletingId === d.id}
                      className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      aria-label={`Reopen ${d.date}`}
                      title="Reopen this day"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      {canManage && (
        <SectionCard title="Close a day">
          <form onSubmit={submit} className="space-y-4 px-5 py-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Date <span className="text-brand-500">*</span>
              </label>
              <div className="group relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-600">
                  <CalendarDays size={15} />
                </span>
                <input
                  type="date"
                  min={todayISO}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Reason / السبب
              </label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="عيد الأضحى / Public holiday"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
              />
            </div>
            {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={saving || !date}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-brand-600 to-brand-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:from-brand-500 hover:to-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
            >
              <Plus size={16} /> {saving ? 'Saving…' : 'Mark as closed'}
            </button>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Customers won’t be able to book this day, and it will be greyed out
              in the booking calendar.
            </p>
          </form>
        </SectionCard>
      )}
    </div>
  )
}
