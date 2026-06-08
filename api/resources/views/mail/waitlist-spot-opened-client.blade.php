@extends('mail.layouts.bookready', [
  'preheader' => 'A spot just opened on ' . \Carbon\Carbon::parse($appointmentDate)->format('M j') . ' — claim it before it goes.',
  'eyebrow'   => 'Spot opened',
  'headline'  => 'A spot just opened.',
  'intro'     => "Hi " . $customerName . ", a matching cancellation came in at " . $businessName . ". This slot is offered to you first — first to click claims it.",
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Service', 'value' => $serviceName])
  @include('mail.partials.kv', ['label' => 'Date',    'value' => \Carbon\Carbon::parse($appointmentDate)->format('l, F j, Y')])
  @include('mail.partials.kv', ['label' => 'Time',    'value' => $startTime ? \Carbon\Carbon::createFromFormat('H:i', $startTime)->format('g:i A') : 'See booking page'])
  @include('mail.partials.kv', ['label' => 'Expires', 'value' => $expiresAt->format('g:i A') . ' today'])
</table>

<div style="text-align:center;margin:24px 0 8px;">
  <a href="{{ $claimUrl }}" style="display:inline-block;background:#121212;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;font-size:11px;">
    Claim this spot
  </a>
</div>
@endsection

@section('extra')
This claim link is single-use and expires in 2 hours. If you don't claim it, we'll offer the slot to the next person on the list.
@endsection
