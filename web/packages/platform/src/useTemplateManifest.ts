'use client'

import { useEffect, useState } from 'react'
import { loadTemplateManifest } from '@/templates/registry'
import type { TemplateManifest } from './manifest'

/**
 * React hook for the editor to load a tenant's template manifest.
 *
 * The manifest declares which header / footer fields the template
 * actually surfaces (so the editor can hide controls the template would
 * silently ignore) and how the template interprets the theme color
 * picker (accent highlight vs. page background).
 *
 * Returns `{ manifest, loading }`. While loading, callers should fall
 * back to a safe default — typically render the field anyway (so legacy
 * tenants on a stale manifest don't lose access) or show a tiny skeleton.
 *
 * The manifest is a small JSON-shaped object (~1 KB), so the
 * dynamic import resolves in a single microtask after the first call.
 * Subsequent calls with the same slug hit the browser's module cache.
 */
export function useTemplateManifest(
  slug: string | null | undefined,
): { manifest: TemplateManifest | null; loading: boolean } {
  const [manifest, setManifest] = useState<TemplateManifest | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    let cancelled = false

    if (!slug) {
      setManifest(null)
      setLoading(false)
      return
    }

    setLoading(true)
    loadTemplateManifest(slug)
      .then(m => {
        if (cancelled) return
        setManifest(m)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setManifest(null)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [slug])

  return { manifest, loading }
}
