import AuthBrandPanel from './AuthBrandPanel'

interface AuthShellProps {
  children: React.ReactNode
}

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-cream flex items-start sm:items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[1060px] flex border border-[rgba(18,18,18,0.10)] bg-white min-h-[640px]">
        {/* Brand panel — left column, desktop only */}
        <div className="hidden lg:flex lg:w-[400px] xl:w-[460px] flex-shrink-0 bg-lavender flex-col border-r border-[rgba(18,18,18,0.10)]">
          <AuthBrandPanel />
        </div>

        {/* Form panel */}
        <div className="flex-1 bg-white flex flex-col justify-center px-6 sm:px-10 py-10">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden flex items-center gap-2.5">
            <div className="w-7 h-7 bg-near-black flex items-center justify-center flex-shrink-0">
              <img src="/logo.svg" alt="" className="w-4 h-4 invert" />
            </div>
            <span className="text-sm font-bold text-near-black tracking-tight">BookReady</span>
          </div>

          <div className="w-full max-w-[390px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
