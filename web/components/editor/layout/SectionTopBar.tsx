'use client'

/**
 * Thin top strip that shows the current section name.
 * Renders in capital-eyebrow style so the inner nav + page header below
 * can use their own bolder typography without competing.
 */
export default function SectionTopBar({ label }: { label: string }) {
  return (
    <div className="flex items-center border-b border-hairline-soft bg-white px-4 sm:px-5 md:px-6 py-3 flex-shrink-0">
      <p className="text-eyebrow font-bold tracking-[0.18em] uppercase text-muted-text">
        {label}
      </p>
    </div>
  )
}
