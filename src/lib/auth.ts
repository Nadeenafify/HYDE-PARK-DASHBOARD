/**
 * Admin session management for the dashboard.
 *
 * Credentials are verified by the backend (POST /api/login), which returns a
 * signed JWT on success. We persist that token and the api client (lib/api.ts)
 * attaches it as a Bearer header on every request; the backend validates it on
 * each protected endpoint. No credentials are ever embedded in the client
 * bundle, and the token is meaningful server-side (unlike the previous
 * client-only check).
 */
const TOKEN_KEY = 'hpd_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Called by the api client when an authenticated request is rejected with 401
 * (i.e. the token is missing/expired). useAuth registers a handler here so the
 * app can drop back to the login screen.
 */
let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.()
}
