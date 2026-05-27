@extends('mail.layouts.bookready', [
  'preheader' => 'Reset your BookReady password.',
  'eyebrow'   => 'Password reset',
  'headline'  => 'Reset your password',
  'intro'     => 'Hi ' . $customerName . ' — someone (hopefully you) asked to reset the password on your BookReady account.',
])

@section('cta')
<a href="{{ $resetUrl }}" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Reset password &rarr;
</a>
@endsection

@section('extra')
<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#3A3A3A;">
  This link is good for the next {{ $ttlMins }} minutes. After that, you&rsquo;ll need to request a new one.
</p>
<p style="margin:0;font-size:12px;line-height:1.55;color:#6B7280;">
  Didn&rsquo;t ask for this? You can safely ignore this email &mdash; your password won&rsquo;t change unless someone clicks the link above and sets a new one.
</p>
<p style="margin:14px 0 0;font-size:11px;line-height:1.5;color:#9AA0A6;word-break:break-all;">
  If the button doesn&rsquo;t work, paste this URL into your browser:<br>
  {{ $resetUrl }}
</p>
@endsection
