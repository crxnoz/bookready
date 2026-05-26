import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

// Phase S6 part 2 — backend redirects here after a successful
// verify-email click from the inbox. The actual verification work
// happened on the backend; this page just confirms + bounces the
// user back to the editor.

export const metadata = {
  title: 'Email verified — BookReady',
}

export default function VerifyEmailSuccessPage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white border border-[rgba(18,18,18,0.10)] p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center text-green-700">
          <CheckCircle size={40} strokeWidth={1.5} />
        </div>
        <h1 className="text-[20px] font-bold text-near-black tracking-tight mb-2">
          Email verified
        </h1>
        <p className="text-[13px] text-muted-text leading-relaxed mb-6">
          Thanks for confirming your email. Your BookReady workspace is
          ready to go.
        </p>
        <Link
          href="/editor"
          className="inline-block bg-near-black text-white text-[12px] font-bold tracking-[0.10em] uppercase px-5 py-3 hover:opacity-90"
        >
          Continue to dashboard
        </Link>
      </div>
    </div>
  )
}
