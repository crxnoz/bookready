@extends('mail.layouts.bookready', [
  'preheader' => 'Your appointment with ' . $businessName . ' is confirmed.',
  'eyebrow'   => 'Appointment confirmed',
  'headline'  => 'You&rsquo;re booked in!',
  'intro'     => $businessName . ' just confirmed your appointment. We&rsquo;ll see you soon.',
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Service', 'value' => $appt['service_name']])
  @include('mail.partials.kv', ['label' => 'Date',    'value' => \Carbon\Carbon::parse($appt['appointment_date'])->format('l, F j, Y')])
  @include('mail.partials.kv', ['label' => 'Time',    'value' => \Carbon\Carbon::createFromFormat('H:i', $appt['start_time'])->format('g:i A')])
  @include('mail.partials.kv', ['label' => 'Status',  'value' => 'Confirmed'])
</table>
@endsection

@section('extra')
Need to reschedule or cancel? Reply to this email and the team will take care of it.
@endsection
