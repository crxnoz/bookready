@extends('mail.layouts.bookready', [
  'preheader' => 'Your booking site is ready to set up.',
  'eyebrow'   => 'Welcome',
  'headline'  => 'Your booking site is ready to set up.',
  'intro'     => 'Welcome to BookReady. Your account is active and your workspace for ' . $businessName . ' is ready.',
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:14px 16px;background:#F8F6F2;border-left:3px solid #E8C7DA;font-size:13px;line-height:1.7;color:#121212;">
      <strong style="display:block;margin-bottom:6px;letter-spacing:0.02em;">Next steps</strong>
      <ol style="margin:0;padding-left:18px;color:#3A3A3A;">
        <li>Add your business info</li>
        <li>Create your services</li>
        <li>Set your availability</li>
        <li>Connect Stripe for deposits</li>
        <li>Preview your public booking site</li>
      </ol>
    </td>
  </tr>
</table>
@endsection

@section('cta')
<a href="{{ $dashboardUrl }}" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Open Dashboard &rarr;
</a>
@endsection

@section('extra')
<p style="margin:0;font-size:13px;line-height:1.55;color:#3A3A3A;">
  Hey {{ $ownerName }} — if anything looks off or you&rsquo;d like a hand getting set up,
  just reply to this email. We read every one.
</p>
@endsection
