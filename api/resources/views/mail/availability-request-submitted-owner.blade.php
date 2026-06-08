@extends('mail.layouts.bookready', [
  'preheader' => $customerName . ' requested ' . \Carbon\Carbon::parse($preferredDate)->format('M j') . ' for ' . $serviceName . '.',
  'eyebrow'   => 'Appointment request',
  'headline'  => 'Someone wants to book.',
  'intro'     => $customerName . " asked for a time that isn't currently open. Review it and approve, suggest another time, or decline.",
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Customer', 'value' => $customerName])
  @include('mail.partials.kv', ['label' => 'Email',    'value' => $customerEmail])
  @include('mail.partials.kv', ['label' => 'Service',  'value' => $serviceName])
  @include('mail.partials.kv', ['label' => 'Requested','value' => \Carbon\Carbon::parse($preferredDate)->format('l, F j, Y') . ($preferredTime ? ' at ' . \Carbon\Carbon::createFromFormat('H:i', $preferredTime)->format('g:i A') : '')])
  @if($notes)
  @include('mail.partials.kv', ['label' => 'Notes', 'value' => $notes])
  @endif
</table>

<div style="text-align:center;margin:24px 0 8px;">
  <a href="{{ $manageUrl }}" style="display:inline-block;background:#121212;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;font-size:11px;">
    Review request
  </a>
</div>
@endsection

@section('extra')
No appointment is created until you approve it. The customer has been told you'll respond soon.
@endsection
