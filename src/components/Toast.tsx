import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

let counter = 0

const META: Record<
  ToastKind,
  { Icon: typeof CheckCircle2; ring: string; chip: string; bar: string }
> = {
  success: {
    Icon: CheckCircle2,
    ring: 'ring-emerald-200/70',
    chip: 'bg-emerald-50 text-emerald-600',
    bar: 'bg-emerald-500',
  },
  error: {
    Icon: XCircle,
    ring: 'ring-rose-200/70',
    chip: 'bg-rose-50 text-rose-600',
    bar: 'bg-rose-500',
  },
  info: {
    Icon: Info,
    ring: 'ring-sky-200/70',
    chip: 'bg-sky-50 text-sky-600',
    bar: 'bg-sky-500',
  },
}

function Toast({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const m = META[toast.kind]
  return (
    <div
      className={`animate-rise pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl bg-white py-3 pl-4 pr-3 shadow-card ring-1 ${m.ring}`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${m.bar}`} />
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${m.chip}`}
      >
        <m.Icon size={16} />
      </span>
      <p className="flex-1 pt-0.5 text-sm font-medium leading-snug text-slate-700">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-md p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++counter
      setToasts((list) => [...list, { id, kind, message }])
      setTimeout(() => remove(id), 4000)
    },
    [remove],
  )

  const api: ToastApi = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {toasts.map((t) => (
          <div key={t.id} className="relative w-full max-w-sm">
            <Toast toast={t} onClose={() => remove(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
