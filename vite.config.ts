import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Where the dev server forwards "/api" requests (your backend).
  const target = env.VITE_API_URL || 'http://localhost:3000'

  // When the backend isn't running, the proxy floods the terminal with an
  // ECONNREFUSED AggregateError stack dump for every single request. Vite's
  // built-in error handler (which does the logging) is attached right AFTER
  // this `configure` callback returns, so we defer with setImmediate, strip
  // every 'error' listener, and install one quiet handler in their place:
  // warn once with a concise, actionable line and return a clean 503 so the
  // frontend's fetch gets a normal response (its "backend down" UX takes over)
  // instead of a hung request.
  let warned = false
  const proxy = (): ProxyOptions => ({
    target,
    changeOrigin: true,
    configure: (server) => {
      setImmediate(() => {
        server.removeAllListeners('error')
        server.on('error', (err, _req, res) => {
          const code = (err as NodeJS.ErrnoException).code ?? err.message
          if (!warned) {
            console.warn(
              `\n[proxy] Backend unreachable at ${target} (${code}). ` +
                `Start it, or set VITE_API_PROXY to its URL. ` +
                `Repeat errors are suppressed.\n`,
            )
            warned = true
          }
          // `res` is a ServerResponse for HTTP (a Socket for websockets).
          if (res && 'writeHead' in res && !res.headersSent) {
            res.writeHead(503, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Backend unavailable' }))
          } else if (res && 'end' in res) {
            res.end()
          }
        })
      })
    },
  })

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': proxy(),
        // Uploaded receipt images live under /uploads on the backend.
        '/uploads': proxy(),
      },
    },
  }
})
