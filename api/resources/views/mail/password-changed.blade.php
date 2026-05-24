@extends('mail.layouts.bookready', [
  'preheader' => 'Your BookReady password was just changed.',
  'eyebrow'   => 'Security',
  'headline'  => 'Your password was changed.',
  'intro'     => 'Hi ' . $ownerName . ' — the password on your BookReady account was just updated at ' . $changedAt . '.',
])

@section('cta')
<a href="https://app.bkrdy.me/editor/settings?tab=account" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Open Account Settings &rarr;
</a>
@endsection

@section('extra')
<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#3A3A3A;">
  If that was you — you can ignore this email. You&rsquo;re all set.
</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#3A3A3A;">
  If it wasn&rsquo;t you, open Account Settings and:
</p>
<ol style="margin:8px 0 0 18px;padding:0;font-size:13px;line-height:1.7;color:#3A3A3A;">
  <li>Reset your password again (use a strong one)</li>
  <li>Click <strong>Sign out everywhere</strong> to kick the intruder off any other device</li>
</ol>
@endsection
