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
        // BookReady editor / auth palette
        cream: '#F8F6F2',
        'near-black': '#121212',
        blush: '#E8C7DA',
        lavender: '#E8E4FF',
        'muted-text': '#6B7280',
        border: 'rgba(18,18,18,0.12)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
    },
  },
  plugins: [],
}

export default config
