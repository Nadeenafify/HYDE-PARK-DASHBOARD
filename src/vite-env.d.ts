/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the dashboard API. Defaults to "/api" (served via the dev proxy). */
  readonly VITE_API_URL?: string
  /** Proxy target the dev server forwards "/api" to. Defaults to http://localhost:3000. */
  readonly VITE_API_PROXY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
