'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, AlertCircle, ArrowLeft, GitCommit } from 'lucide-react'
import { AdminShell } from '../AdminShell'
import { useAdmin } from '../AdminProvider'
import { getAdminDashboardDeploys, type AdminDeployReport } from '@/lib/api'
import { Card, relTime } from '../_parts'

/**
 * /admin/system/deploys — recent deploy history (append-only log written
 * by the deploy script). When errors spike, "did we just ship something?"
 * is the first question; this gives you the timeline at a glance.
 */
export default function SystemDeploysPage() {
  const { auth } = useAdmin()
  const [data,    setData]    = useState<AdminDeployReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState<string | null>(null)

  useEffect(() => {
    if (auth !== 'ready') return
    let cancelled = false
    ;(async () => {
      try {
        const d = await getAdminDashboardDeploys()
        if (! cancelled) setData(d)
      } catch (e) {
        if (! cancelled) setErr(e instanceof Error ? e.message : 'Failed to load deploys')
      } finally {
        if (! cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [auth])

  return (
    <AdminShell tab="system">
      <Link
        href="/admin/system"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted-text hover:text-near-black mb-4"
      >
        <ArrowLeft size={12} /> System health
      </Link>

      <header className="mb-4">
        <h1 className="text-xl font-bold text-near-black tracking-tight inline-flex items-center gap-2">
          <GitCommit size={18} /> Recent deploys
        </h1>
        <p className="text-xs text-muted-text mt-1">
          Append-only log from <code className="font-mono text-[11px]">storage/app/deploys.jsonl</code>,
          written by the deploy script.
        </p>
      </header>

      {err && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> {err}
        </div>
      )}

      {loading && (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 flex items-center gap-2 text-xs text-muted-text">
          <Loader2 size={14} className="animate-spin" /> Reading deploy log…
        </div>
      )}

      {data && data.deploys.length === 0 && (
        <Card>
          <p className="text-[13px] text-near-black">No deploys logged yet.</p>
          <p className="text-[12px] text-muted-text mt-1">
            {data.note ?? 'The next deploy will populate this log.'}
          </p>
        </Card>
      )}

      {data && data.deploys.length > 0 && (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] divide-y divide-[rgba(18,18,18,0.06)]">
          {data.deploys.map((d, i) => {
            const ghHref = d.commit ? `https://github.com/crxnoz/bookready/commit/${d.commit}` : null
            return (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f6f3d] mt-1.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-near-black">
                    {d.message ?? '(no message)'}
                  </p>
                  <p className="text-[11px] text-muted-text mt-0.5">
                    {ghHref ? (
                      <a href={ghHref} target="_blank" rel="noopener noreferrer"
                        className="font-mono hover:text-near-black hover:underline">
                        {d.commit}
                      </a>
                    ) : <span className="font-mono">{d.commit ?? '—'}</span>}
                    {' '}· {d.deployed_at ? relTime(d.deployed_at) : '—'}
                    {d.deployed_at && (
                      <span className="text-muted-text/70"> · {new Date(d.deployed_at).toLocaleString()}</span>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminShell>
  )
}
