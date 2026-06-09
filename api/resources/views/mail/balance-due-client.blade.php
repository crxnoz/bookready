@php
  $curr      = strtoupper($currency);
  $sym       = $curr === 'USD' ? '$' : '';
  $amountStr = $sym . number_format($amount, 2) . ' ' . $curr;
  $apptStr   = \Illuminate\Support\Carbon::parse($appointmentDate)->format('l, F j') . ' at ' . $startTime;
  $bal       = $isBalance ?? true;
@endphp

@extends('mail.layouts.bookready', [
  'preheader' => ($bal ? 'Remaining balance: ' : 'Payment to confirm your booking: ') . $amountStr,
  'eyebrow'   => $bal ? 'Balance due' : 'Confirm your booking',
  'headline'  => $bal ? 'Pay your remaining balance.' : 'Confirm your booking with a payment.',
  'intro'     => $bal
    ? 'Hi ' . $customerName . ', ' . $businessName . ' is collecting the balance for your ' . $serviceName . ' on ' . $apptStr . '. The link below takes you straight to secure Stripe checkout.'
    : 'Hi ' . $customerName . ', ' . $businessName . ' is holding your ' . $serviceName . ' for ' . $apptStr . '. Pay below to lock in the appointment.',
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:14px 16px;background:#F8F6F2;border-left:3px solid #E8C7DA;font-size:13px;line-height:1.7;color:#121212;">
      <strong style="display:block;margin-bottom:6px;letter-spacing:0.02em;">{{ $bal ? 'Amount due' : 'Amount to pay' }}</strong>
      <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.01em;color:#121212;">
        {{ $amountStr }}
      </p>
    </td>
  </tr>
</table>
@endsection

@section('cta')
<a href="{{ $checkoutUrl }}" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Pay {{ $amountStr }} &rarr;
</a>
@endsection

@section('extra')
<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#3A3A3A;">
  This link works for the next 24 hours. If it expires, just reply to this email and {{ $businessName }} will send a fresh one.
</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#3A3A3A;">
  Payment is processed securely by Stripe. {{ $businessName }} never sees your card number.
</p>
@endsection
