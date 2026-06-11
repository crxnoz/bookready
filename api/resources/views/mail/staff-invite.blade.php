@extends('mail.layouts.bookready', [
  'preheader' => 'Set a password to access your schedule.',
  'eyebrow'   => 'Staff invite',
  'headline'  => $businessName . ' invited you to BookReady.',
  'intro'     => 'Hi ' . ($staffName ?: 'there') . ', ' . $businessName . ' uses BookReady to manage bookings. Set a password to see your appointments and manage your own schedule.',
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:14px 16px;background:#F8F6F2;border-left:3px solid #E8C7DA;font-size:13px;line-height:1.7;color:#121212;">
      <strong style="display:block;margin-bottom:6px;letter-spacing:0.02em;">What you can do</strong>
      <ul style="margin:0;padding-left:18px;color:#3A3A3A;">
        <li>See your own appointments and customer contact info</li>
        <li>Mark appointments complete or no-show</li>
        <li>Cancel or reschedule your own appointments</li>
        <li>Edit your profile and set your own hours</li>
      </ul>
    </td>
  </tr>
</table>
@endsection

@section('cta')
<a href="{{ $acceptUrl }}" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Accept Invite &rarr;
</a>
@endsection

@section('extra')
<p style="margin:0;font-size:13px;line-height:1.55;color:#3A3A3A;">
  This invite link expires in 24 hours and can only be used once. If it
  has expired, ask {{ $businessName }} to send a new one.
</p>
@endsection
