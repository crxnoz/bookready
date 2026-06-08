import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge, taught about our custom design tokens.
 *
 * Without this, twMerge doesn't know `text-eyebrow` / `text-2xs` are
 * font-sizes (they're custom fontSize keys in tailwind.config), so it
 * misclassifies them as text-COLOR utilities. Then a call like
 *   cn('text-eyebrow ...', 'bg-cream text-muted-text')
 * makes twMerge think `text-eyebrow` and `text-muted-text` conflict (both
 * "text color") and it drops the earlier one — leaving the element with NO
 * font-size, so it inherits the parent's and renders huge. Same story for
 * the custom `tracking-eyebrow` letter-spacing token.
 *
 * Registering the tokens in their correct class groups fixes this globally
 * (every Chip/StatusBadge/eyebrow that pairs a size token with a color).
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['eyebrow', '2xs'] }],
      tracking:    [{ tracking: ['eyebrow'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
