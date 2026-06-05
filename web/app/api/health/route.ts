import { NextResponse } from 'next/server'

/**
 * #123 — Frontend liveness probe.
 *
 * GET /api/health  →  200 { status: 'ok', time }
 *
 * Deliberately minimal: it proves the Next.js server is up and serving
 * route handlers without rendering a full page or hitting the API.
 * Monitored by the server-side bookready-uptime.sh cron + any external
 * monitor pointed at https://app.bkrdy.me/api/health.
 *
 * force-dynamic + no-store so a CDN / build cache can never serve a
 * stale 200 while the server is actually down.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    { status: 'ok', time: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
