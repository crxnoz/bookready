@extends('mail.layouts.bookready', [
  'preheader' => $recipientRole === 'old'
      ? 'Your BookReady account email was changed.'
      : 'Your BookReady account email is now ' . $newEmail . '.',
  'eyebrow'   => 'Security',
  'headline'  => $recipientRole === 'old'
      ? 'Your account email was changed.'
      : 'You&rsquo;re all set.',
  'intro'     => $recipientRole === 'old'
      ? ('Hi ' . $ownerName . ' — the email on your BookReady account changed from this address at ' . $changedAt . '.')
      : ('Hi ' . $ownerName . ' — this is now the email on your BookReady account, as of ' . $changedAt . '.'),
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Previous email', 'value' => $oldEmail])
  @include('mail.partials.kv', ['label' => 'New email',      'value' => $newEmail])
  @include('mail.partials.kv', ['label' => 'Changed at',     'value' => $changedAt])
</table>
@endsection

@section('cta')
<a href="https://app.bkrdy.me/editor/settings?tab=account" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Open Account Settings &rarr;
</a>
@endsection

@section('extra')
@if ($recipientRole === 'old')
<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#3A3A3A;">
  If <strong>you</strong> made this change, you can ignore this email — you&rsquo;ll receive future emails at <strong>{{ $newEmail }}</strong> from now on.
</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#b42828;">
  If you didn&rsquo;t change it, your account may have been compromised. Reset your password right away and then click <strong>Sign out everywhere</strong> from Account Settings.
</p>
@else
<p style="margin:0;font-size:13px;line-height:1.55;color:#3A3A3A;">
  Future booking notifications and account emails will arrive at this address.
  The previous email also received a notification of this change.
</p>
@endif
@endsection
