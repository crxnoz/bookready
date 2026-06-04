'use client'

/**
 * #159 — Role picker shown after login when the identity has both
 * an owner and customer role.
 *
 * Login already set the cookie for the DEFAULT role (owner if both
 * exist, else customer). If the user wants the other one, this picker
 * calls POST /auth/switch-role to revoke the current token + mint a
 * fresh one for the target role + swap the cookie.
 *
 * Per founder decision (#159), this picker fires on EVERY multi-role
 * login — explicit, friction-light, no "default role memory" needed.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, User, Loader2, ArrowRight } from 'lucide-react'
import { switchRole } from '@/lib/api'
import { cn } from '@/lib/cn'

interface Props {
  /** Set when login response indicated multi-role. Picker won't render
   *  if either of the two roles isn't here. */
  availableRoles: ('owner' | 'customer')[]
  /** Which role the cookie was just set for, so we know if we need
   *  to call switch-role (when user picks the other) or just redirect
   *  (when user picks the same). */
  currentRole: 'owner' | 'customer'
  /** Where to send the user when they pick a role. Defaults to the
   *  matching dashboard. */
  destinations?: { owner: string; customer: string }
}

export default function RolePicker({
  availableRoles,
  currentRole,
  destinations = { owner: '/editor', customer: '/account' },
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<'owner' | 'customer' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (! availableRoles.includes('owner') || ! availableRoles.includes('customer')) {
    return null
  }

  async function pick(role: 'owner' | 'customer') {
    setBusy(role); setError(null)
    try {
      if (role !== currentRole) {
        const res = await switchRole(role)
        // Trust the backend's redirect_url over our local destinations
        // map — it knows the canonical landing page for each role.
        window.location.href = res.redirect_url || destinations[role]
        return
      }
      // Same role as cookie already set — just navigate.
      router.replace(destinations[role])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not switch role. Try again.')
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white border border-[rgba(18,18,18,0.10)] max-w-md w-full p-8">
        <div className="mb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2">
            Continue as
          </p>
          <h1 className="text-[22px] font-bold text-near-black tracking-tight mb-1">
            Which account?
          </h1>
          <p className="text-[13px] text-muted-text">
            You have both a business owner and a customer profile under this email.
            Pick one to continue.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-[11px] text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-2.5">
          <RoleCard
            icon={Building2}
            title="Business owner"
            subtitle="Manage your salon, services, and bookings"
            busy={busy === 'owner'}
            disabled={busy !== null}
            onClick={() => void pick('owner')}
          />
          <RoleCard
            icon={User}
            title="Customer"
            subtitle="See your bookings at BookReady salons"
            busy={busy === 'customer'}
            disabled={busy !== null}
            onClick={() => void pick('customer')}
          />
        </div>
      </div>
    </div>
  )
}

function RoleCard({
  icon: Icon, title, subtitle, busy, disabled, onClick,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  busy: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left p-4 bg-cream border border-[rgba(18,18,18,0.12)]',
        'hover:border-near-black transition-colors',
        'flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    >
      <div className="w-10 h-10 bg-white border border-[rgba(18,18,18,0.10)] flex items-center justify-center text-near-black flex-shrink-0">
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-near-black">{title}</p>
        <p className="text-[11px] text-muted-text truncate">{subtitle}</p>
      </div>
      {busy ? (
        <Loader2 size={14} className="animate-spin text-near-black flex-shrink-0" />
      ) : (
        <ArrowRight size={14} className="text-muted-text flex-shrink-0" />
      )}
    </button>
  )
}
