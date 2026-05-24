@extends('mail.layouts.bookready', [
  'preheader' => 'We received your booking request for ' . $businessName . '.',
  'eyebrow'   => 'Booking request received',
  'headline'  => 'Thanks, ' . $appt['customer_name'] . '!',
  'intro'     => 'We received your request and ' . $businessName . ' will review and confirm shortly.',
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Service', 'value' => $appt['service_name']])
  @include('mail.partials.kv', ['label' => 'Date',    'value' => \Carbon\Carbon::parse($appt['appointment_date'])->format('l, F j, Y')])
  @include('mail.partials.kv', ['label' => 'Time',    'value' => \Carbon\Carbon::createFromFormat('H:i', $appt['start_time'])->format('g:i A')])
  @include('mail.partials.kv', ['label' => 'Status',  'value' => 'Pending confirmation'])
</table>

<div style="margin-top:18px;padding:14px 16px;background:#F8F6F2;border-left:3px solid #E8C7DA;font-size:13px;line-height:1.55;color:#3A3A3A;">
  You&rsquo;ll get another email as soon as your appointment is confirmed. No action needed from you in the meantime.
</div>
@endsection

@if (! empty($appt['manage_url']))
@section('cta')
<a href="{{ $appt['manage_url'] }}" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Manage your booking &rarr;
</a>
@endsection
@endif
