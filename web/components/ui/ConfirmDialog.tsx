'use client'

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import Modal from './Modal'
import Button from './Button'
import Input from './Input'

/**
 * The ONE confirmation system. Replaces native confirm()/alert() across the
 * tenant app. Promise-based for ergonomic adoption:
 *
 *   const confirm = useConfirm()
 *   if (await confirm({ title: 'Cancel this appointment?', tone: 'danger' })) { ... }
 *
 * High-blast-radius actions pass `requireText` for type-to-confirm
 * (generalizes the delete-account pattern):
 *   await confirm({ title: 'Delete account', requireText: slug, confirmLabel: 'Delete forever', tone: 'danger' })
 */

export interface ConfirmOptions {
  title:         string
  message?:      ReactNode
  confirmLabel?: string
  cancelLabel?:  string
  tone?:         'default' | 'danger'
  requireText?:  string   // when set, user must type this exact string to enable confirm
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>')
  return ctx
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const [text, setText] = useState('')
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options)
    setText('')
    return new Promise<boolean>(resolve => { resolver.current = resolve })
  }, [])

  const close = useCallback((ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOpts(null)
    setText('')
  }, [])

  const textOk = !opts?.requireText || text.trim() === opts.requireText.trim()

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!opts}
        onClose={() => close(false)}
        title={opts?.title}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => close(false)}>
              {opts?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              variant={opts?.tone === 'danger' ? 'destructive' : 'primary'}
              size="sm"
              disabled={!textOk}
              onClick={() => close(true)}
            >
              {opts?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        {opts?.message && <div className="text-sm text-muted-text">{opts.message}</div>}
        {opts?.requireText && (
          <div className="mt-4">
            <Input
              label={`Type "${opts.requireText}" to confirm`}
              value={text}
              onChange={e => setText(e.target.value)}
              autoFocus
            />
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  )
}
