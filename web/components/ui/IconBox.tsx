import { cn } from '@/lib/cn'

/**
 * The BookReady icon-box — a sharp, bordered square around a single lucide
 * icon. The section/feature-header signature across the editor.
 *
 *   light (default): cream fill, muted glyph
 *   dark:            translucent-white on a near-black surface (dark cards)
 */
export default function IconBox({
  icon: Icon, size = 'md', tone = 'light',
}: {
  icon: React.ElementType
  size?: 'sm' | 'md'
  tone?: 'light' | 'dark'
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center flex-shrink-0 border',
        size === 'sm' ? 'w-7 h-7' : 'w-8 h-8',
        tone === 'dark' ? 'bg-white/10 border-white/20' : 'bg-cream border-hairline-soft',
      )}
    >
      <Icon
        size={size === 'sm' ? 13 : 15}
        className={tone === 'dark' ? 'text-white/80' : 'text-muted-text'}
      />
    </div>
  )
}
