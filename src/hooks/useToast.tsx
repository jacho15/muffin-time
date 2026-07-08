import { createContext, useContext, useCallback, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

type ToastTone = 'error'
type Toast = { id: string; message: string; tone: ToastTone }

type ToastContextValue = { pushToast: (message: string, tone?: ToastTone) => void }

// Default is a no-op so a stray call outside the provider never crashes.
const ToastContext = createContext<ToastContextValue>({ pushToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const AUTO_DISMISS_MS = 5000
const DEDUPE_MS = 3000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  // Suppress an identical message that fires again within a few seconds (e.g. a
  // retrying fetch or several rows failing at once) so we don't stack duplicates.
  const recent = useRef<Map<string, number>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  const pushToast = useCallback((message: string, tone: ToastTone = 'error') => {
    const now = Date.now()
    const last = recent.current.get(message)
    if (last && now - last < DEDUPE_MS) return
    recent.current.set(message, now)

    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, tone }])
    timers.current.set(id, setTimeout(() => dismiss(id), AUTO_DISMISS_MS))
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const reduceMotion = useReducedMotion()
  return (
    <div
      className="fixed inset-x-0 bottom-6 z-[200] flex flex-col items-center gap-2 px-4 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            layout
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-auto flex items-start gap-3 max-w-md w-full sm:w-auto rounded-lg border border-nova-pink/30 bg-void/90 backdrop-blur px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          >
            <AlertTriangle size={16} className="text-nova-pink shrink-0 mt-0.5" />
            <p className="text-sm text-star-white/90 flex-1">{toast.message}</p>
            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss"
              className="p-0.5 -m-0.5 rounded text-star-white/50 hover:text-star-white transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
