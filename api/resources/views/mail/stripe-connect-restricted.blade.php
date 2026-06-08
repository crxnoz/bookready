@extends('mail.layouts.bookready', [
  'preheader' => 'Stripe needs more information to keep accepting payments for ' . $businessName . '.',
  'eyebrow'   => 'Action required',
  'headline'  => 'Stripe needs more info on your account.',
  'intro'     => 'Hi ' . $ownerName . ' — Stripe flagged your connected account for ' . $businessName . ' and paused payments until the requirements are resolved. Customers can&rsquo;t complete bookings that require a payment until this is sorted.',
])

@section('cta')
<a href="https://app.bkrdy.me/editor/integrations" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Open Integrations &rarr;
</a>
@endsection

@section('extra')
<p style="margin:0 0 10px;font-size:13px;line-height:1.55;color:#3A3A3A;">
  From the Payment Settings page, click <strong>Continue onboarding</strong> on the Stripe Connect card. Stripe will tell you exactly what they need (often a clearer ID photo, an updated business detail, or a verification document).
</p>
<p style="margin:0;font-size:12px;line-height:1.55;color:#6B7280;">
  Bookings that don&rsquo;t require payment continue to work normally in the meantime.
</p>
@endsection
