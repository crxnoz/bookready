@extends('mail.layouts.bookready', [
  'preheader' => 'Your BookReady account is ready.',
  'eyebrow'   => 'Welcome',
  'headline'  => 'Your BookReady account is ready',
  'intro'     => 'Hi ' . $customerName . ', your BookReady account is set up. Sign in any time to see your upcoming bookings and manage future ones across every business you book with.',
])

@section('cta')
<a href="{{ $accountUrl }}" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Open my account &rarr;
</a>
@endsection

@section('extra')
<p style="margin:0;font-size:12px;line-height:1.55;color:#6B7280;">
  Didn&rsquo;t create a BookReady account? You can ignore this email. Nothing happens until you sign in.
</p>
@endsection
