@extends('mail.layouts.bookready', [
  'preheader' => 'Verify your BookReady email address.',
  'eyebrow'   => 'Email verification',
  'headline'  => 'Confirm your email',
  'intro'     => 'Hi ' . $customerName . ' — thanks for creating a BookReady account. Click the button below to verify your email so you can see and manage your bookings.',
])

@section('cta')
<a href="{{ $verifyUrl }}" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Verify email &rarr;
</a>
@endsection

@section('extra')
<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#3A3A3A;">
  This link is good for the next {{ $ttlMins }} minutes. After that, sign in to your account and request a new verification email.
</p>
<p style="margin:0;font-size:12px;line-height:1.55;color:#6B7280;">
  Didn&rsquo;t create a BookReady account? You can ignore this email &mdash; nothing happens until you click the button above.
</p>
<p style="margin:14px 0 0;font-size:11px;line-height:1.5;color:#9AA0A6;word-break:break-all;">
  If the button doesn&rsquo;t work, paste this URL into your browser:<br>
  {{ $verifyUrl }}
</p>
@endsection
