@extends('mail.layouts.bookready', [
  'preheader' => ($appt['customer_name'] ?: 'A client') . ' moved their appointment.',
  'eyebrow'   => 'Booking rescheduled by client',
  'headline'  => ($appt['customer_name'] ?: 'A client') . ' moved their appointment.',
  'intro'     => 'Your calendar has been updated automatically.',
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Client',  'value' => $appt['customer_name']])
  @include('mail.partials.kv', ['label' => 'Service', 'value' => $appt['service_name']])
  @include('mail.partials.kv', ['label' => 'New date', 'value' => \Carbon\Carbon::parse($appt['appointment_date'])->format('l, F j, Y')])
  @include('mail.partials.kv', ['label' => 'New time', 'value' => \Carbon\Carbon::createFromFormat('H:i', $appt['start_time'])->format('g:i A')])
  @include('mail.partials.kv', ['label' => 'Was on',   'value' => \Carbon\Carbon::parse($oldAppt['appointment_date'])->format('l, F j, Y') . ' at ' . \Carbon\Carbon::createFromFormat('H:i', $oldAppt['start_time'])->format('g:i A')])
  @if (! empty($appt['customer_email']))
    @include('mail.partials.kv', ['label' => 'Email',   'value' => $appt['customer_email']])
  @endif
</table>
@endsection

@section('cta')
<a href="https://app.bkrdy.me/editor/appointments" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Open Appointments &rarr;
</a>
@endsection
