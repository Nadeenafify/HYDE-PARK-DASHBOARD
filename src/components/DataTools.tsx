import { useRef, useState } from 'react'
import { FileSpreadsheet, Database, Upload } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Booking, RestoreResult } from '../types'
import { SectionCard } from './ui'
import { api } from '../lib/api'
import { useToast } from './Toast'
import { exportBookingsToExcel, downloadJson } from '../lib/exporters'

type Busy = null | 'export' | 'backup' | 'restore'

function Tile({
  onClick,
  disabled,
  busy,
  label,
  busyLabel,
  sub,
  icon,
  iconClass,
  borderClass,
}: {
  onClick: () => void
  disabled: boolean
  busy: boolean
  label: string
  busyLabel: string
  sub: string
  icon: ReactNode
  iconClass: string
  borderClass: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card disabled:opacity-60 disabled:hover:translate-y-0 ${borderClass}`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition group-hover:scale-105 ${iconClass}`}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {busy ? busyLabel : label}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
      </div>
    </button>
  )
}

export function DataTools({
  bookings,
  onRestore,
}: {
  bookings: Booking[]
  onRestore: (data: unknown) => Promise<RestoreResult>
}) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<Busy>(null)

  async function handleExport() {
    setBusy('export')
    try {
      await exportBookingsToExcel(bookings)
      toast.success(`Exported ${bookings.length} bookings to Excel.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setBusy(null)
    }
  }

  async function handleBackup() {
    setBusy('backup')
    try {
      const data = await api.getBackup()
      const today = new Date().toISOString().slice(0, 10)
      downloadJson(`hpd-backup-${today}.json`, data)
      toast.success('Backup downloaded.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Backup failed.')
    } finally {
      setBusy(null)
    }
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy('restore')
    try {
      const data = JSON.parse(await file.text())
      const result = await onRestore(data)
      const { units, bookings } = result
      toast.success(
        `Restored ${units.created} units and ${bookings.created} bookings (existing kept).`,
      )
      const skipped = units.skipped + bookings.skipped
      const failed = units.failed + bookings.failed
      const warnings = bookings.warnings.length
      if (skipped || failed || warnings) {
        const parts = [
          skipped ? `${skipped} already present` : '',
          failed ? `${failed} could not be added` : '',
          warnings ? `${warnings} reference a missing unit` : '',
        ].filter(Boolean)
        const detail = [...units.errors, ...bookings.errors, ...bookings.warnings]
          .slice(0, 3)
          .map((n) => `${n.ref}: ${n.reason}`)
          .join(' · ')
        const message = parts.join(', ') + (detail ? ` — ${detail}` : '')
        if (failed) toast.error(message)
        else toast.info(message)
      }
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : 'Restore failed — is the file a valid backup?',
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <SectionCard title="Backup & export" className="mt-6">
      <div className="space-y-4 px-5 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Tile
            onClick={handleExport}
            disabled={busy !== null}
            busy={busy === 'export'}
            label="Export bookings"
            busyLabel="Exporting…"
            sub="Spreadsheet (.xlsx)"
            icon={<FileSpreadsheet size={18} />}
            iconClass="bg-emerald-50 text-emerald-600 ring-emerald-100"
            borderClass="hover:border-emerald-200"
          />
          <Tile
            onClick={handleBackup}
            disabled={busy !== null}
            busy={busy === 'backup'}
            label="Download backup"
            busyLabel="Backing up…"
            sub="Full copy (.json)"
            icon={<Database size={18} />}
            iconClass="bg-sky-50 text-sky-600 ring-sky-100"
            borderClass="hover:border-sky-200"
          />
          <Tile
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            busy={busy === 'restore'}
            label="Restore from backup"
            busyLabel="Restoring…"
            sub="Upload a backup file"
            icon={<Upload size={18} />}
            iconClass="bg-amber-50 text-amber-600 ring-amber-100"
            borderClass="hover:border-amber-200"
          />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleRestoreFile}
        />

        <p className="text-[11px] leading-relaxed text-slate-400">
          <b className="font-semibold text-slate-500">Export</b> a spreadsheet of
          bookings · <b className="font-semibold text-slate-500">Backup</b> a full
          copy of all data ·{' '}
          <b className="font-semibold text-slate-500">Restore</b> re-adds missing
          records (existing data is never deleted).
        </p>
      </div>
    </SectionCard>
  )
}
