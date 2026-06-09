@extends('mail.layouts.bookready', [
  'preheader' => 'Your appointment with ' . $businessName . ' is coming up.',
  'eyebrow'   => 'Reminder',
  'headline'  => 'See you soon, ' . $appt['customer_name'] . '.',
  'intro'     => ($customIntro ?? null) ?: ('Your appointment with ' . $businessName . ' is coming up in roughly ' . $hoursBefore . ' hour' . ($hoursBefore === 1 ? '' : 's') . '.'),
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Service', 'value' => $appt['service_name']])
  @include('mail.partials.kv', ['label' => 'Date',    'value' => \Carbon\Carbon::parse($appt['appointment_date'])->format('l, F j, Y')])
  @include('mail.partials.kv', ['label' => 'Time',    'value' => \Carbon\Carbon::createFromFormat('H:i', $appt['start_time'])->format('g:i A')])
  @include('mail.partials.kv', ['label' => 'Status',  'value' => ucfirst((string) ($appt['status'] ?? 'confirmed'))])
</table>
@endsection

@if (! empty($appt['manage_url']))
@section('cta')
<a href="{{ $appt['manage_url'] }}" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Manage your booking &rarr;
</a>
@if (! empty($appt['add_to_calendar_url']))
<div style="margin-top:10px;">
  <a href="{{ $appt['add_to_calendar_url'] }}" style="display:inline-block;background:#FFFFFF;color:#121212;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:10px 18px;border:1px solid rgba(18,18,18,0.30);">
    Add to your calendar
  </a>
</div>
@endif
@endsection
@endif

@section('extra')
Need to reschedule or cancel? Use the link above or reply to this email and the team will help.
@if (! empty($customSignoff))
<div style="margin-top:14px;">{!! nl2br(e($customSignoff)) !!}</div>
@endif
@endsection
