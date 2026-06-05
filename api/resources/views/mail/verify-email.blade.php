@extends('mail.layouts.bookready', [
  'preheader' => 'Your BookReady verification code is ' . $verifyCode,
  'eyebrow'   => 'Email verification',
  'headline'  => 'Confirm your email',
  'intro'     => 'Hi ' . $ownerName . ' — thanks for joining BookReady. Enter the 6-digit code below on the verification screen, or click the button if you opened this email on the same device.',
])

@section('details')
{{-- A6: The code is the primary verification mechanic. Show it large and
     monospace so it's easy to read out from one device and type into
     another. --}}
<div style="background:#F8F6F2;border:1px solid rgba(18,18,18,0.10);padding:20px 24px;text-align:center;">
  <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#6B7280;">
    Your verification code
  </p>
  <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.18em;color:#121212;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">
    {{ $verifyCode }}
  </p>
  <p style="margin:8px 0 0;font-size:11px;color:#6B7280;">
    Expires in 15 minutes.
  </p>
</div>
@endsection

@section('cta')
<a href="{{ $verifyUrl }}" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Or verify with one click &rarr;
</a>
@endsection

@section('extra')
<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#3A3A3A;">
  Either method works. The code expires in 15 minutes; the link is good for {{ $ttlMins }} minutes after that, sign in and request a new one from your dashboard.
</p>
<p style="margin:0;font-size:12px;line-height:1.55;color:#6B7280;">
  Didn&rsquo;t create a BookReady account? You can ignore this email &mdash; the code is useless without your password.
</p>
<p style="margin:14px 0 0;font-size:11px;line-height:1.5;color:#9AA0A6;word-break:break-all;">
  If the button doesn&rsquo;t work, paste this URL into your browser:<br>
  {{ $verifyUrl }}
</p>
@endsection
