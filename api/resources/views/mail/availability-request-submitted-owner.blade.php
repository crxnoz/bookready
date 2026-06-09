@extends('mail.layouts.bookready', [
  'preheader' => $customerName . ' requested ' . \Carbon\Carbon::parse($preferredDate)->format('M j') . ' for ' . $serviceName . '.',
  'eyebrow'   => 'Appointment request',
  'headline'  => 'Someone wants to book.',
  'intro'     => $customerName . " asked for a time that isn't currently open. Review it and approve, suggest another time, or decline.",
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Customer', 'value' => $customerName])
  @if (! empty($customerEmail))
    @include('mail.partials.kv', ['label' => 'Email',    'value' => $customerEmail])
  @endif
  @include('mail.partials.kv', ['label' => 'Service',  'value' => $serviceName])
  @include('mail.partials.kv', ['label' => 'Requested','value' => \Carbon\Carbon::parse($preferredDate)->format('l, F j, Y') . ($preferredTime ? ' at ' . \Carbon\Carbon::createFromFormat('H:i', $preferredTime)->format('g:i A') : '')])
  @if($notes)
  @include('mail.partials.kv', ['label' => 'Notes', 'value' => $notes])
  @endif
</table>
@endsection

@section('cta')
<a href="{{ $manageUrl }}" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Review request &rarr;
</a>
@endsection

@section('extra')
No appointment is created until you approve. We let the customer know you&rsquo;ll respond soon.
@endsection
