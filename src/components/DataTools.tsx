import { useRef, useState } from 'react'
import { FileSpreadsheet, Database, Upload } from 'lucide-react'
import type { Booking } from '../types'
import { SectionCard } from './ui'
import { api } from '../lib/api'
import { exportBookingsToExcel, downloadJson } from '../lib/exporters'

type Busy = null | 'export' | 'backup' | 'restore'

const BTN =
  'inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'

export function DataTools({
  bookings,
  onRestore,
}: {
  bookings: Booking[]
  onRestore: (data: unknown) => Promise<{
    units: { created: number; skipped: number }
    bookings: { created: number; skipped: number }
  }>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleExport() {
    setBusy('export')
    setMsg(null)
    try {
      await exportBookingsToExcel(bookings)
      setMsg({ ok: true, text: `Exported ${bookings.length} bookings to Excel.` })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Export failed.' })
    } finally {
      setBusy(null)
    }
  }

  async function handleBackup() {
    setBusy('backup')
    setMsg(null)
    try {
      const data = await api.getBackup()
      const today = new Date().toISOString().slice(0, 10)
      downloadJson(`hpd-backup-${today}.json`, data)
      setMsg({ ok: true, text: 'Backup downloaded.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Backup failed.' })
    } finally {
      setBusy(null)
    }
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy('restore')
    setMsg(null)
    try {
      const data = JSON.parse(await file.text())
      const result = await onRestore(data)
      setMsg({
        ok: true,
        text: `Restored ${result.units.created} units and ${result.bookings.created} bookings (existing kept).`,
      })
    } catch (e) {
      setMsg({
        ok: false,
        text:
          e instanceof Error
            ? e.message
            : 'Restore failed — is the file a valid backup?',
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <SectionCard title="Backup & export" className="mt-6">
      <div className="space-y-3 px-5 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button type="button" onClick={handleExport} disabled={busy !== null} className={BTN}>
            <FileSpreadsheet size={16} />
            {busy === 'export' ? 'Exporting…' : 'Export bookings (Excel)'}
          </button>
          <button type="button" onClick={handleBackup} disabled={busy !== null} className={BTN}>
            <Database size={16} />
            {busy === 'backup' ? 'Backing up…' : 'Download backup'}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            className={BTN}
          >
            <Upload size={16} />
            {busy === 'restore' ? 'Restoring…' : 'Restore from backup'}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleRestoreFile}
        />
        {msg && (
          <p
            className={`text-xs font-medium ${
              msg.ok ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {msg.text}
          </p>
        )}
        <p className="text-[11px] leading-relaxed text-slate-400">
          <b>Export</b> = a spreadsheet of bookings. <b>Backup</b> = a full copy of
          all data (JSON). <b>Restore</b> re-adds missing records from a backup —
          existing data is never deleted.
        </p>
      </div>
    </SectionCard>
  )
}
