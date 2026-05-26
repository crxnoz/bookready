@extends('mail.layouts.bookready', [
  'preheader' => 'Your appointment with ' . $businessName . ' has been cancelled.',
  'eyebrow'   => 'Appointment cancelled',
  'headline'  => 'Your appointment was cancelled.',
  'intro'     => ($customIntro ?? null) ?: ($businessName . ' cancelled the appointment below. If this wasn’t expected, reply to this email and they’ll be in touch.'),
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Service', 'value' => $appt['service_name']])
  @include('mail.partials.kv', ['label' => 'Date',    'value' => \Carbon\Carbon::parse($appt['appointment_date'])->format('l, F j, Y')])
  @include('mail.partials.kv', ['label' => 'Time',    'value' => \Carbon\Carbon::createFromFormat('H:i', $appt['start_time'])->format('g:i A')])
  @include('mail.partials.kv', ['label' => 'Status',  'value' => 'Cancelled'])
</table>
@endsection

@section('extra')
Want to pick another time? Just visit the booking page again to choose a new slot.
@if (! empty($customSignoff))
<div style="margin-top:14px;">{!! nl2br(e($customSignoff)) !!}</div>
@endif
@endsection
