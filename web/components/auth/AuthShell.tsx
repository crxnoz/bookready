import AuthBrandPanel from './AuthBrandPanel'

interface AuthShellProps {
  children: React.ReactNode
}

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen flex">
      {/* Brand panel — left column, desktop only */}
      <div className="hidden lg:flex lg:w-[460px] xl:w-[520px] flex-shrink-0 bg-near-black flex-col">
        <AuthBrandPanel />
      </div>

      {/* Form panel — fills remaining space */}
      <div className="flex-1 bg-cream flex flex-col items-center justify-center px-6 py-14">
        {/* Mobile wordmark */}
        <div className="mb-8 lg:hidden">
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-near-black">
            BookReady
          </span>
        </div>

        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  )
}
