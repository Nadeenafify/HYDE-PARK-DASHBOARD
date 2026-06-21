import { useMemo, useState } from 'react'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Local YYYY-MM-DD (avoids a UTC off-by-one), matching the booking payload.
function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Month calendar that disables days you can't postpone onto: past dates,
 * weekends (Fri/Sat), and admin-declared holidays. Mirrors the customer-facing
 * DateTimePicker so the dashboard refuses the same dates the server does.
 */
export function HolidayCalendar({
  value,
  onChange,
  minISO,
  closedDays,
}: {
  /** Currently selected day as "YYYY-MM-DD", or '' if none. */
  value: string
  onChange: (iso: string) => void
  /** Earliest selectable day, "YYYY-MM-DD" (today). */
  minISO: string
  /**
   * Admin-declared holidays, "YYYY-MM-DD" -> reason. null = not loaded yet, so
   * admin holidays aren't marked yet (weekends and past days still are).
   */
  closedDays: Map<string, string> | null
}) {
  const [vy, vm] = (value || minISO).split('-').map(Number)
  const [viewYear, setViewYear] = useState(vy)
  const [viewMonth, setViewMonth] = useState(vm - 1)

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = useMemo(
    () => [
      ...Array<null>(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ],
    [firstWeekday, daysInMonth],
  )

  function goMonth(delta: number) {
    const date = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(date.getFullYear())
    setViewMonth(date.getMonth())
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-700">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={() => goMonth(1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[0.65rem] font-semibold text-slate-400">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={i >= 5 ? 'text-slate-300' : ''}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} />
          const cellDate = new Date(viewYear, viewMonth, day)
          const iso = toISO(cellDate)
          const weekday = cellDate.getDay() // 5 = Fri, 6 = Sat
          const isWeekend = weekday === 5 || weekday === 6
          const holiday = closedDays?.get(iso)
          const isPast = iso < minISO
          const disabled = isPast || isWeekend || !!holiday
          const isSelected = iso === value
          return (
            <div key={iso} className="flex items-center justify-center">
              <button
                type="button"
                disabled={disabled}
                title={
                  holiday
                    ? `عطلة رسمية (${holiday}) · Official holiday`
                    : isWeekend
                      ? 'الجمعة والسبت إجازة رسمية · Weekend holiday'
                      : undefined
                }
                onClick={() => onChange(iso)}
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full transition',
                  isSelected
                    ? 'bg-slate-900 font-semibold text-white shadow-sm'
                    : disabled
                      ? 'cursor-not-allowed text-slate-300'
                      : 'text-slate-700 hover:bg-slate-100',
                ].join(' ')}
              >
                {day}
              </button>
            </div>
          )
        })}
      </div>

      <p className="mt-2 text-center text-[11px] text-slate-400">
        الجمعة والسبت والأعياد الرسمية معطّلة · Weekends &amp; holidays disabled
      </p>
    </div>
  )
}
