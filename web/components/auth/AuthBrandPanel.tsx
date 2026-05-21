const BENEFITS = ['Online booking', 'Mobile-ready templates', 'Client management']

export default function AuthBrandPanel() {
  return (
    <div className="flex flex-col h-full p-10 xl:p-12">
      {/* Logo */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-7 h-7 bg-near-black flex items-center justify-center flex-shrink-0">
          <img src="/logo.svg" alt="" className="w-4 h-4 invert" />
        </div>
        <span className="text-sm font-bold text-near-black tracking-tight">BookReady</span>
      </div>

      {/* Main copy */}
      <div className="mt-10 flex-1 flex flex-col">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-4">
          For beauty entrepreneurs
        </p>
        <h2 className="text-[26px] xl:text-[32px] font-bold text-near-black tracking-tight leading-tight mb-4">
          Launch your booking website without the messy setup.
        </h2>
        <p className="text-sm text-muted-text mb-8 leading-relaxed">
          Create a polished website, manage appointments, and give clients a smoother way to book.
        </p>

        {/* Benefits */}
        <ul className="space-y-3 mb-8 list-none p-0">
          {BENEFITS.map(b => (
            <li key={b} className="flex items-center gap-3">
              <div className="w-5 h-5 flex-shrink-0 border border-[rgba(18,18,18,0.18)] bg-white flex items-center justify-center">
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#121212" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm font-medium text-near-black">{b}</span>
            </li>
          ))}
        </ul>

        {/* Mini site preview */}
        <div className="border border-[rgba(18,18,18,0.12)] bg-white overflow-hidden mt-auto">
          {/* Browser bar */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-[rgba(18,18,18,0.08)] bg-cream">
            <span className="w-2 h-2 rounded-full bg-[rgba(18,18,18,0.15)]" />
            <span className="w-2 h-2 rounded-full bg-[rgba(18,18,18,0.15)]" />
            <span className="w-2 h-2 rounded-full bg-[rgba(18,18,18,0.15)]" />
            <span className="ml-2 text-[10px] text-muted-text flex-1 border border-[rgba(18,18,18,0.10)] bg-white px-2 py-0.5 truncate">
              ava.bkrdy.me
            </span>
          </div>
          {/* Content */}
          <div className="p-4">
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-1">Hair Studio</p>
            <p className="text-sm font-bold text-near-black mb-0.5">Ava Studio</p>
            <p className="text-xs text-muted-text mb-3">Editorial cuts and colour, by appointment.</p>
            <div className="inline-block bg-near-black text-white text-[10px] font-bold tracking-[0.12em] uppercase px-3 py-1.5 mb-3">
              Book Now
            </div>
            <div className="border-t border-[rgba(18,18,18,0.08)]">
              {[
                { name: 'Signature Cut', price: '$65' },
                { name: 'Colour Refresh', price: '$120' },
                { name: 'Blow Dry', price: '$45' },
              ].map(s => (
                <div key={s.name} className="flex justify-between py-2 border-b border-[rgba(18,18,18,0.06)] last:border-0 text-[11px]">
                  <span className="text-near-black">{s.name}</span>
                  <span className="font-semibold text-near-black">{s.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
