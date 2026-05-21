const BENEFITS = [
  {
    label: 'Online booking',
    desc: 'Let clients book 24/7 from your own website.',
  },
  {
    label: 'Mobile-ready site',
    desc: 'Your booking page looks great on every device.',
  },
  {
    label: 'Client management',
    desc: 'Track every client, appointment, and service.',
  },
]

export default function AuthBrandPanel() {
  return (
    <div className="flex flex-col h-full p-10 xl:p-14">
      {/* Wordmark */}
      <div>
        <span className="text-[11px] font-bold tracking-[0.24em] uppercase text-white/90">
          BookReady
        </span>
      </div>

      {/* Main copy */}
      <div className="mt-auto">
        <h2 className="text-3xl xl:text-4xl font-bold text-white tracking-tight leading-tight mb-4">
          Your booking website,<br />built for beauty.
        </h2>
        <p className="text-sm text-white/50 mb-10 leading-relaxed">
          Everything you need to take bookings, manage clients,<br />
          and grow your business — in one place.
        </p>

        {/* Benefits */}
        <div className="space-y-5 mb-12">
          {BENEFITS.map(b => (
            <div key={b.label} className="flex items-start gap-3">
              <div className="w-5 h-5 flex-shrink-0 border border-white/20 flex items-center justify-center mt-0.5">
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none mb-1">{b.label}</p>
                <p className="text-xs text-white/45 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mini site preview wireframe */}
        <div className="border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="h-2 w-20 bg-white/35 mb-1.5" />
              <div className="h-1.5 w-14 bg-white/15" />
            </div>
            <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/60 border border-white/20 px-2.5 py-1">
              Book Now
            </div>
          </div>
          <div className="space-y-0">
            {[
              { w1: 'w-24', w2: 'w-12', p: '$55' },
              { w1: 'w-20', w2: 'w-10', p: '$30' },
              { w1: 'w-28', w2: 'w-14', p: '$75' },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 border-b border-white/10 last:border-0"
              >
                <div className="flex flex-col gap-1">
                  <div className={`h-1.5 ${row.w1} bg-white/30`} />
                  <div className={`h-1 ${row.w2} bg-white/15`} />
                </div>
                <span className="text-[11px] font-semibold text-white/50">{row.p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
