import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── BookReady design tokens (Visual System v1) ──────────────────
        // Additive + back-compatible. Existing names kept; new semantic
        // tokens added so the cohesion sweep can replace inline hexes and
        // the 10+ ad-hoc border opacities with names. No overrides here, so
        // adding these changes nothing visually until components adopt them.

        // Surfaces + ink (existing names are canonical)
        cream: '#F8F6F2',          // app/page background  (alias: bg)
        'near-black': '#121212',   // primary text / fills / active  (alias: ink)
        'muted-text': '#6B7280',   // secondary text  (alias: ink-muted)
        'faint-text': '#B0A99F',   // placeholder / disabled text

        // Brand accents
        blush: '#E8C7DA',
        lavender: '#E8E4FF',

        // Hairlines — the ONLY three border colors going forward
        border: 'rgba(18,18,18,0.12)',          // legacy default (kept)
        'hairline-soft': 'rgba(18,18,18,0.08)', // dividers, internal lines
        hairline: 'rgba(18,18,18,0.12)',        // default card/section edge
        'hairline-strong': 'rgba(18,18,18,0.20)',// inputs, emphasis

        // Status — one foreground + one tint per family (kills the sprawl)
        success: '#0F6F3D',
        'success-bg': '#EAF3EE',
        warning: '#8A5A00',
        'warning-icon': '#C98A14',
        'warning-bg': '#FFF8E6',
        danger: '#B42828',
        'danger-bg': '#FBEAEA',
        // info → lavender, neutral → cream/muted-text (no new tokens needed)

        // Gradient stops — reserved for Coming-Soon / marquee moments only
        'soon-from': '#FFE5F0',
        'soon-to': '#F0E5FF',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Named small sizes so dense UI stops using arbitrary text-[10px]/[11px].
        // eyebrow carries its own tracking; 2xs is for badges + dense meta.
        // (xs=12 / sm=14 / base=16 / lg=18 / xl=20 / 2xl=24 stay Tailwind defaults.)
        // size-only (tracking lives on the `tracking-eyebrow` utility) so a
        // plain 10px fold doesn't inject letter-spacing where it isn't wanted.
        eyebrow: ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],      // 11px
      },
      letterSpacing: {
        tightest: '-0.04em',
        eyebrow: '0.14em',
      },
    },
  },
  plugins: [],
}

export default config
