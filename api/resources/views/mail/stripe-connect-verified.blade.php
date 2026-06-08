@extends('mail.layouts.bookready', [
  'preheader' => 'Stripe is connected. ' . $businessName . ' can accept online payments.',
  'eyebrow'   => 'Stripe connected',
  'headline'  => 'You&rsquo;re ready to collect payments.',
  'intro'     => 'Hi ' . $ownerName . ' — Stripe just verified the connected account for ' . $businessName . '. Customer deposits and payments will land in your Stripe account from now on.',
])

@section('cta')
<a href="https://app.bkrdy.me/editor/integrations" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Open Integrations &rarr;
</a>
@endsection

@section('extra')
<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#3A3A3A;">
  A few quick things you can do next:
</p>
<ul style="margin:0 0 0 18px;padding:0;font-size:13px;line-height:1.7;color:#3A3A3A;">
  <li>Turn on <strong>deposits</strong> in Payment Settings and pick flat or percent</li>
  <li>Decide if you want clients to be able to pay <strong>in full up front</strong></li>
  <li>Share your booking link so the first deposit can roll in</li>
</ul>
@endsection
