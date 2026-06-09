@extends('mail.layouts.bookready', [
  'preheader' => 'Your first booking just landed.',
  'eyebrow'   => 'First booking',
  'headline'  => 'You got your first booking, ' . $ownerName . '!',
  'intro'     => $businessName . ' just received its very first booking on BookReady. That’s a real one. Congrats.',
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Client',  'value' => $appt['customer_name']])
  @include('mail.partials.kv', ['label' => 'Service', 'value' => $appt['service_name']])
  @include('mail.partials.kv', ['label' => 'Date',    'value' => \Carbon\Carbon::parse($appt['appointment_date'])->format('l, F j, Y')])
  @include('mail.partials.kv', ['label' => 'Time',    'value' => \Carbon\Carbon::createFromFormat('H:i', $appt['start_time'])->format('g:i A')])
</table>
@endsection

@section('cta')
<a href="https://app.bkrdy.me/editor/appointments" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  See it in the dashboard &rarr;
</a>
@endsection

@section('extra')
<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#3A3A3A;">
  A few ideas while the momentum is fresh:
</p>
<ul style="margin:0 0 0 18px;padding:0;font-size:13px;line-height:1.7;color:#3A3A3A;">
  <li>Share your booking link on social</li>
  <li>Add a Before &amp; After section to your site</li>
  <li>Turn on appointment reminders so clients show up on time</li>
</ul>
@endsection
