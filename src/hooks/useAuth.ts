import { useCallback, useEffect, useState } from 'react'
import type { AppUser } from '../types'
import {
  getToken,
  setToken,
  clearToken,
  setUnauthorizedHandler,
} from '../lib/auth'
import { api } from '../lib/api'

export interface AuthState {
  isAuthenticated: boolean
  currentUser: AppUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

/**
 * Auth gate for the dashboard. Holds the JWT (persisted in localStorage) plus
 * the logged-in user (for role-based UI). The api client auto-clears the token
 * on a 401 and notifies us so the UI drops back to the login screen.
 */
export function useAuth(): AuthState {
  const [token, setTok] = useState<string | null>(() => getToken())
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setTok(null)
      setCurrentUser(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  // Re-hydrate the user (and role) from the saved token on load.
  useEffect(() => {
    if (!token) {
      setCurrentUser(null)
      return
    }
    let active = true
    api
      .getMe()
      .then((u) => {
        if (active) setCurrentUser(u)
      })
      .catch(() => {
        /* a 401 is handled by the unauthorized handler above */
      })
    return () => {
      active = false
    }
  }, [token])

  const login = useCallback(async (email: string, password: string) => {
    const { token: t, user } = await api.login(email, password)
    setToken(t)
    setTok(t)
    setCurrentUser(user)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setTok(null)
    setCurrentUser(null)
  }, [])

  return { isAuthenticated: Boolean(token), currentUser, login, logout }
}
