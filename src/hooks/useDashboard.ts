import { useCallback, useEffect, useState } from 'react'
import type { Booking, BookingStatus, Unit } from '../types'
import { api } from '../lib/api'

export type HealthState = 'checking' | 'ok' | 'down'

export interface DashboardState {
  bookings: Booking[]
  units: Unit[]
  health: HealthState
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  updateStatus: (id: string, status: BookingStatus) => Promise<void>
  postpone: (
    id: string,
    installationDate: string,
    installationTime: string,
  ) => Promise<void>
  deleteBooking: (id: string) => Promise<void>
  addUnit: (payload: { unitNumber: string; type?: string; owner?: string }) => Promise<void>
  /** Populate with bundled demo data when the backend is unavailable. */
  loadDemo: (bookings: Booking[]) => void
}

export function useDashboard(): DashboardState {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [health, setHealth] = useState<HealthState>('checking')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = useCallback(async () => {
    try {
      await api.health()
      setHealth('ok')
    } catch {
      setHealth('down')
    }
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Units are non-critical — don't fail the whole load if that call errors.
      const [b, u] = await Promise.all([
        api.getBookings(),
        api.getUnits().catch(() => [] as Unit[]),
      ])
      // Flag units that already have a booking (matched by unit code).
      const bookedCodes = new Set(b.map((x) => x.unitNumber))
      setBookings(b)
      setUnits(
        u.map((unit) => ({
          ...unit,
          booked: unit.booked || bookedCodes.has(unit.unitNumber),
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void checkHealth()
    void reload()
  }, [checkHealth, reload])

  const updateStatus = useCallback(
    async (id: string, status: BookingStatus) => {
      const snapshot = bookings
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b)),
      )
      try {
        await api.updateStatus(id, status)
      } catch (e) {
        setBookings(snapshot) // revert
        throw e
      }
    },
    [bookings],
  )

  const postpone = useCallback(
    async (id: string, installationDate: string, installationTime: string) => {
      const updated = await api.postpone(id, installationDate, installationTime)
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)))
    },
    [],
  )

  const deleteBooking = useCallback(
    async (id: string) => {
      const snapshot = bookings
      setBookings((prev) => prev.filter((b) => b.id !== id))
      try {
        await api.deleteBooking(id)
      } catch (e) {
        setBookings(snapshot) // revert
        throw e
      }
    },
    [bookings],
  )

  const addUnit = useCallback(
    async (payload: { unitNumber: string; type?: string; owner?: string }) => {
      const created = await api.createUnit(payload)
      setUnits((prev) => [created, ...prev])
    },
    [],
  )

  const loadDemo = useCallback((demo: Booking[]) => {
    setBookings(demo)
    setError(null)
    setLoading(false)
  }, [])

  return {
    bookings,
    units,
    health,
    loading,
    error,
    reload,
    updateStatus,
    postpone,
    deleteBooking,
    addUnit,
    loadDemo,
  }
}
