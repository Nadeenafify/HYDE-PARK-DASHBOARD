import { useCallback, useEffect, useState } from 'react'
import {
  getToken,
  setToken,
  clearToken,
  setUnauthorizedHandler,
} from '../lib/auth'
import { api } from '../lib/api'

export interface AuthState {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

/**
 * Admin auth gate for the dashboard. Holds the JWT (persisted in localStorage)
 * and exposes login/logout. The api client auto-clears the token on a 401, and
 * notifies us here so the UI drops back to the login screen.
 */
export function useAuth(): AuthState {
  const [token, setTok] = useState<string | null>(() => getToken())

  useEffect(() => {
    setUnauthorizedHandler(() => setTok(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    // Verified by the backend, which returns a signed JWT (see lib/api.ts).
    const sessionToken = await api.login(username, password)
    setToken(sessionToken)
    setTok(sessionToken)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setTok(null)
  }, [])

  return { isAuthenticated: Boolean(token), login, logout }
}
