import AppSidebar from './AppSidebar'

interface AppShellProps {
  children: React.ReactNode
  slug: string
}

export default function AppShell({ children, slug }: AppShellProps) {
  return (
    <div className="flex flex-col md:flex-row bg-cream" style={{ minHeight: '100dvh' }}>
      <AppSidebar slug={slug} />
      <div className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        {children}
      </div>
    </div>
  )
}
