import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Plus,
  X,
  Check,
  Loader2,
  Clock,
  CalendarDays,
  AlertTriangle,
  Layers,
} from 'lucide-react'
import type { Schedule, ScheduleMode } from '../types'
import { api } from '../lib/api'
import { useToast } from './Toast'

const DAY_LABELS = [
  { en: 'Sunday', ar: 'الأحد' },
  { en: 'Monday', ar: 'الإثنين' },
  { en: 'Tuesday', ar: 'الثلاثاء' },
  { en: 'Wednesday', ar: 'الأربعاء' },
  { en: 'Thursday', ar: 'الخميس' },
  { en: 'Friday', ar: 'الجمعة' },
  { en: 'Saturday', ar: 'السبت' },
]

// "14:30" (from <input type="time">) -> "2:30 PM"
function to12h(value: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const mins = m[2]
  const period = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${mins} ${period}`
}

function slotMinutes(slot: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(slot.trim())
  if (!m) return 0
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (h === 12) h = 0
  if (m[3].toUpperCase() === 'PM') h += 12
  return h * 60 + min
}

const sortSlots = (slots: string[]) =>
  [...slots].sort((a, b) => slotMinutes(a) - slotMinutes(b))

const clone = (s: Schedule): Schedule => JSON.parse(JSON.stringify(s))

// Canonical form used to detect unsaved edits (order-independent).
const serialize = (s: Schedule): string =>
  JSON.stringify({
    mode: s.mode,
    globalSlots: sortSlots(s.globalSlots),
    days: s.days.map((d) => ({ open: d.open, slots: sortSlots(d.slots) })),
  })

// One-click times offered alongside the manual picker.
const PRESET_TIMES = [
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
]

export function WorkingHours({ canManage }: { canManage: boolean }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [baseline, setBaseline] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    let active = true
    api
      .getSchedule()
      .then((s) => {
        if (!active) return
        setSchedule(s)
        setBaseline(serialize(s))
      })
      .catch(() => active && toast.error('Could not load the schedule.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function mutate(fn: (s: Schedule) => void) {
    setSchedule((prev) => {
      if (!prev) return prev
      const next = clone(prev)
      fn(next)
      return next
    })
  }

  function addSlot(target: 'global' | number, slot: string) {
    mutate((s) => {
      if (target === 'global') {
        if (!s.globalSlots.includes(slot))
          s.globalSlots = sortSlots([...s.globalSlots, slot])
      } else if (!s.days[target].slots.includes(slot)) {
        s.days[target].slots = sortSlots([...s.days[target].slots, slot])
      }
    })
  }

  function removeSlot(target: 'global' | number, slot: string) {
    mutate((s) => {
      if (target === 'global')
        s.globalSlots = s.globalSlots.filter((x) => x !== slot)
      else s.days[target].slots = s.days[target].slots.filter((x) => x !== slot)
    })
  }

  function setAllOpen(open: boolean) {
    mutate((s) => s.days.forEach((d) => (d.open = open)))
  }

  async function save() {
    if (!schedule) return
    setSaving(true)
    try {
      const saved = await api.updateSchedule(schedule)
      setSchedule(saved)
      setBaseline(serialize(saved))
      toast.success('Working hours saved.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !schedule) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft">
        <div className="flex items-center justify-center gap-2 px-5 py-20 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin" />
          Loading working hours…
        </div>
      </div>
    )
  }

  const openCount = schedule.days.filter((d) => d.open).length
  const totalSlots =
    schedule.mode === 'global' ? schedule.globalSlots.length : null
  const dirty = baseline !== null && serialize(schedule) !== baseline

  return (
    <div className="animate-fade space-y-5">
      {/* ── Settings card with gradient hero ───────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-card">
        {/* Hero */}
        <div className="relative overflow-hidden bg-linear-to-br from-brand-600 to-brand-800 px-5 py-5 text-white sm:px-6">
          {/* decorative glows */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-brand-400/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-white/10 blur-3xl"
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                <CalendarDays size={20} />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  Working hours
                </h2>
                <p className="mt-0.5 max-w-md text-sm leading-relaxed text-white/70">
                  Pick the days you accept installations and the times customers
                  can book.
                </p>
              </div>
            </div>

            {canManage && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium transition ${
                    dirty ? 'text-amber-200' : 'hidden sm:inline-flex sm:invisible'
                  }`}
                  aria-hidden={!dirty}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                  Unsaved changes
                </span>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !dirty}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Check size={15} />
                  )}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}
          </div>

          {/* Summary stats */}
          <div className="relative mt-4 flex flex-wrap gap-2.5">
            <HeroStat
              icon={<CalendarDays size={13} />}
              label={`${openCount} of 7 days open`}
            />
            <HeroStat
              icon={<Clock size={13} />}
              label={
                totalSlots !== null
                  ? `${totalSlots} shared ${totalSlots === 1 ? 'slot' : 'slots'}`
                  : 'Custom times per day'
              }
            />
            <HeroStat
              icon={<Layers size={13} />}
              label={
                schedule.mode === 'global'
                  ? 'Same for all days'
                  : 'Different per day'
              }
            />
          </div>
        </div>

        {/* Mode selector */}
        <div className="px-5 py-5 sm:px-6">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            How are time slots set?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                [
                  'global',
                  'Same for all days',
                  'One shared list of times applies to every open day.',
                ],
                [
                  'perDay',
                  'Different per day',
                  'Give each open day its own set of available times.',
                ],
              ] as [ScheduleMode, string, string][]
            ).map(([m, label, desc]) => {
              const active = schedule.mode === m
              return (
                <button
                  key={m}
                  type="button"
                  disabled={!canManage}
                  onClick={() => mutate((s) => void (s.mode = m))}
                  className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${
                    active
                      ? 'border-brand-300 bg-brand-50/60 ring-1 ring-brand-200'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>
                    <span
                      className={`block text-sm font-semibold ${
                        active ? 'text-brand-800' : 'text-slate-800'
                      }`}
                    >
                      {label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      {desc}
                    </span>
                  </span>
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                      active
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {active && <Check size={11} strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Global slot editor */}
          {schedule.mode === 'global' && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <Clock size={14} />
                </span>
                <p className="text-sm font-semibold text-slate-700">
                  Available times — every open day
                </p>
              </div>
              {schedule.globalSlots.length === 0 && (
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                  <AlertTriangle size={12} />
                  No times yet — open days won't be bookable until you add some.
                </p>
              )}
              <SlotEditor
                slots={schedule.globalSlots}
                canManage={canManage}
                onAdd={(s) => addSlot('global', s)}
                onRemove={(s) => removeSlot('global', s)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Days grid ──────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Days of the week
          </p>
          {canManage && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAllOpen(true)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Open all
              </button>
              <span className="text-slate-200">|</span>
              <button
                type="button"
                onClick={() => setAllOpen(false)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Close all
              </button>
            </div>
          )}
        </div>

        <div
          className={`grid gap-3 ${
            schedule.mode === 'perDay'
              ? 'grid-cols-1 lg:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}
        >
          {DAY_LABELS.map((d, i) => {
            const day = schedule.days[i]
            const dayCount =
              schedule.mode === 'global'
                ? schedule.globalSlots.length
                : day.slots.length
            const noTimes = day.open && dayCount === 0
            return (
              <div
                key={d.en}
                className={`rounded-2xl border p-3.5 transition sm:p-4 ${
                  day.open
                    ? 'border-emerald-200/80 bg-white shadow-soft'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold uppercase transition ${
                        day.open
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {d.en.slice(0, 3)}
                    </span>
                    <div>
                      <p
                        className={`font-semibold leading-tight ${
                          day.open ? 'text-slate-800' : 'text-slate-500'
                        }`}
                      >
                        {d.en}
                      </p>
                      <p className="text-xs text-slate-400">{d.ar}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canManage}
                    aria-pressed={day.open}
                    aria-label={`Toggle ${d.en}`}
                    onClick={() =>
                      mutate((s) => void (s.days[i].open = !s.days[i].open))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      day.open ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        day.open ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Status / contents */}
                {!day.open ? (
                  <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
                    Closed — not available for booking.
                  </p>
                ) : schedule.mode === 'perDay' ? (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    {noTimes && (
                      <p className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                        <AlertTriangle size={11} />
                        No times set
                      </p>
                    )}
                    <SlotEditor
                      slots={day.slots}
                      canManage={canManage}
                      onAdd={(s) => addSlot(i, s)}
                      onRemove={(s) => removeSlot(i, s)}
                    />
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs">
                    {noTimes ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                        <AlertTriangle size={12} />
                        No shared times yet
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        <Clock size={12} />
                        Uses the {dayCount} shared{' '}
                        {dayCount === 1 ? 'time' : 'times'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function HeroStat({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur-sm">
      <span className="text-white/80">{icon}</span>
      {label}
    </span>
  )
}

function SlotEditor({
  slots,
  canManage,
  onAdd,
  onRemove,
}: {
  slots: string[]
  canManage: boolean
  onAdd: (slot: string) => void
  onRemove: (slot: string) => void
}) {
  const [time, setTime] = useState('')
  const presets = PRESET_TIMES.filter((t) => !slots.includes(t))

  function add() {
    const label = to12h(time)
    if (label) {
      onAdd(label)
      setTime('')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {slots.length === 0 && (
          <span className="text-xs italic text-slate-400">
            No time slots yet — add one below.
          </span>
        )}
        {slots.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
          >
            <Clock size={11} className="text-slate-400" />
            {s}
            {canManage && (
              <button
                type="button"
                onClick={() => onRemove(s)}
                className="-mr-0.5 ml-0.5 rounded-full p-0.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                aria-label={`Remove ${s}`}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>
      {canManage && (
        <div className="mt-2.5 flex items-center gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <button
            type="button"
            onClick={add}
            disabled={!time}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={13} /> Add
          </button>
        </div>
      )}
      {canManage && presets.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-400">
            Quick add:
          </span>
          {presets.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onAdd(t)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-500 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
            >
              <Plus size={10} /> {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
