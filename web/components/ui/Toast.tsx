'use client'

import { cn } from '@/lib/cn'
import { Check, AlertCircle, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * The ONE toast system (BookReady has none today). Transient feedback only
 * — success/error/info. Standing conditions use <Banner>, not toasts.
 *
 *   const toast = useToast()
 *   toast.success('Saved')   toast.error('Could not save')   toast.info('Copied')
 *
 * Mount <ToastProvider> once near the app root (done in the editor layout).
 */

type ToastTone = 'success' | 'error' | 'info'
interface ToastItem { id: number; tone: ToastTone; message: string }
interface ToastApi {
  success: (message: string) => void
  error:   (message: string) => void
  info:    (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

let seq = 0

const TONE: Record<ToastTone, { edge: string; icon: typeof Info; fg: string }> = {
  success: { edge: 'border-l-success', icon: Check,       fg: 'text-success' },
  error:   { edge: 'border-l-danger',  icon: AlertCircle, fg: 'text-danger'  },
  info:    { edge: 'border-l-near-black', icon: Info,      fg: 'text-near-black' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => setItems(list => list.filter(t => t.id !== id)), [])
  const push = useCallback((tone: ToastTone, message: string) => {
    const id = ++seq
    setItems(list => [...list, { id, tone, message }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const api = useMemo<ToastApi>(() => ({
    success: m => push('success', m),
    error:   m => push('error', m),
    info:    m => push('info', m),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-80 pointer-events-none">
        {items.map(t => {
          const { edge, icon: Icon, fg } = TONE[t.tone]
          return (
            <div
              key={t.id}
              className={cn('pointer-events-auto flex items-start gap-2 bg-white border border-hairline border-l-2 shadow-xl px-3 py-2.5', edge)}
              role="status"
            >
              <Icon size={15} className={cn('mt-0.5 shrink-0', fg)} aria-hidden />
              <p className="flex-1 text-xs text-near-black">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-muted-text hover:text-near-black shrink-0">
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
