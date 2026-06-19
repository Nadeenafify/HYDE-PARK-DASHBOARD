import type { Booking } from '../types'

/** Export bookings to an .xlsx spreadsheet (SheetJS lazy-loaded on use). */
export async function exportBookingsToExcel(bookings: Booking[]): Promise<void> {
  const XLSX = await import('xlsx')
  const rows = bookings.map((b) => ({
    Unit: b.unitNumber,
    'First name': b.firstName,
    'Last name': b.lastName,
    Mobile: b.mobile,
    'Installation date': b.installationDate,
    Time: b.timeSlot,
    Status: b.status,
    Receipt: b.receiptUrl ? 'Yes' : 'No',
    Postponed: b.postponeCount && b.postponeCount > 0 ? `${b.postponeCount}×` : '',
    'Original date': b.originalDate ?? '',
    Submitted: b.submittedAt,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Bookings')
  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `hpd-bookings-${today}.xlsx`)
}

/** Trigger a browser download of `data` as a pretty-printed JSON file. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
