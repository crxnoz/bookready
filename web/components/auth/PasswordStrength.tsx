'use client'

/**
 * Shared password strength meter. Originally lived as a local function
 * inside web/app/register/page.tsx — extracted on 2026-06-12 so the
 * staff invite-accept page can show the same meter when a stylist sets
 * their password.
 *
 * Scoring: length tier (0-2 points) + character variety (digit / mixed
 * case / symbol — 0-3 points). Capped at 4. No regex backtracking risk;
 * all character-class scans are O(n).
 */
export default function PasswordStrength({ password }: { password: string }) {
  const score = (() => {
    let s = 0
    if (password.length >= 8)  s++
    if (password.length >= 12) s++
    const variety = [
      /\d/.test(password),
      /[a-z]/.test(password) && /[A-Z]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length
    s += variety
    return Math.min(4, s)
  })()
  const label = ['Too short', 'Weak', 'OK', 'Good', 'Strong'][score]
  const color = ['#b42828', '#b42828', '#c98a14', '#5d8a1c', '#1e7a3f'][score]
  return (
    <div className="mt-2">
      <div className="flex gap-1.5 mb-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="flex-1 h-1"
            style={{
              backgroundColor: i < Math.max(1, score) ? color : 'rgba(18,18,18,0.10)',
            }}
          />
        ))}
      </div>
      <p className="text-[10px] font-semibold" style={{ color }}>
        {label}
      </p>
    </div>
  )
}
