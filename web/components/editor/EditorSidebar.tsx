'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Scissors,
  Image,
  Clock,
  Users,
  FileText,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/cn'

const NAV = [
  { href: '/editor/business', label: 'Business', icon: Building2 },
  { href: '/editor/services', label: 'Services', icon: Scissors },
  { href: '/editor/gallery', label: 'Gallery', icon: Image },
  { href: '/editor/hours', label: 'Hours', icon: Clock },
  { href: '/editor/staff', label: 'Team', icon: Users },
  { href: '/editor/policies', label: 'Policies', icon: FileText },
]

export default function EditorSidebar({ slug }: { slug: string }) {
  const path = usePathname()

  return (
    <aside className="w-[220px] flex-shrink-0 bg-white border-r border-[rgba(18,18,18,0.10)] flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-[rgba(18,18,18,0.08)]">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-0.5">
          BookReady
        </p>
        <p className="text-sm font-bold text-near-black truncate">
          {slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <p className="px-5 pt-2 pb-1 text-[9px] font-bold tracking-[0.2em] uppercase text-muted-text">
          Editor
        </p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors duration-100',
                active
                  ? 'bg-cream text-near-black'
                  : 'text-muted-text hover:bg-[#f8f6f2] hover:text-near-black',
              )}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
              {active && <ChevronRight size={12} className="ml-auto opacity-40" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[rgba(18,18,18,0.08)]">
        <a
          href={`/site/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs font-semibold text-muted-text hover:text-near-black transition-colors w-full px-2 py-2"
        >
          <ExternalLink size={13} />
          Preview Site
        </a>
      </div>
    </aside>
  )
}
