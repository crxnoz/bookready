'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

/**
 * The ONE form-state hook. Deep-compare dirty tracking, explicit save with
 * saving/saved/error states, and Discard-to-baseline. Replaces the four
 * duplicated SaveBar/useSettingsForm implementations.
 *
 *   const f = useFormState(initial, value => api.save(value))
 *   <input value={f.value.name} onChange={e => f.patch({ name: e.target.value })} />
 *   <SaveBar {...f} onSave={f.save} onDiscard={f.discard} />
 */

export interface FormState<T> {
  value:   T
  setValue: (next: T) => void
  patch:   (partial: Partial<T>) => void
  dirty:   boolean
  saving:  boolean
  saved:   boolean
  error:   string | null
  save:    () => Promise<void>
  discard: () => void
  /** Adopt a new server snapshot as the baseline (e.g. after external reload). */
  reset:   (next: T) => void
}

export function useFormState<T>(initial: T, onSave: (value: T) => Promise<unknown>): FormState<T> {
  const [value, setValueRaw] = useState<T>(initial)
  const [baseline, setBaseline] = useState<T>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout>>()

  const dirty = useMemo(
    () => JSON.stringify(value) !== JSON.stringify(baseline),
    [value, baseline],
  )

  const setValue = useCallback((next: T) => { setSaved(false); setValueRaw(next) }, [])
  const patch = useCallback((partial: Partial<T>) => {
    setSaved(false)
    setValueRaw(v => ({ ...v, ...partial }))
  }, [])

  const save = useCallback(async () => {
    setSaving(true); setError(null); setSaved(false)
    try {
      await onSave(value)
      setBaseline(value)
      setSaved(true)
      clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaved(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [value, onSave])

  const discard = useCallback(() => { setError(null); setSaved(false); setValueRaw(baseline) }, [baseline])
  const reset   = useCallback((next: T) => { setBaseline(next); setValueRaw(next); setSaved(false); setError(null) }, [])

  return { value, setValue, patch, dirty, saving, saved, error, save, discard, reset }
}
