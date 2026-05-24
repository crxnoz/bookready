@extends('mail.layouts.bookready', [
  'preheader' => 'New booking request from ' . $appt['customer_name'],
  'eyebrow'   => 'New booking request',
  'headline'  => $appt['customer_name'] . ' wants to book an appointment.',
  'intro'     => 'Heads up — a new request just came in for ' . $businessName . '.',
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Service', 'value' => $appt['service_name']])
  @include('mail.partials.kv', ['label' => 'Date',    'value' => \Carbon\Carbon::parse($appt['appointment_date'])->format('l, F j, Y')])
  @include('mail.partials.kv', ['label' => 'Time',    'value' => \Carbon\Carbon::createFromFormat('H:i', $appt['start_time'])->format('g:i A')])
  @if (!empty($appt['customer_email']))
    @include('mail.partials.kv', ['label' => 'Email', 'value' => $appt['customer_email']])
  @endif
  @if (!empty($appt['customer_phone']))
    @include('mail.partials.kv', ['label' => 'Phone', 'value' => $appt['customer_phone']])
  @endif
  @if (!empty($appt['notes']))
    @include('mail.partials.kv', ['label' => 'Notes', 'value' => $appt['notes']])
  @endif
</table>
@endsection

@section('cta')
<a href="https://app.bkrdy.me/editor/appointments" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Review &amp; Confirm &rarr;
</a>
@endsection
