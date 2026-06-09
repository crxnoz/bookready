@php
  $curr      = strtoupper($currency);
  $sym       = $curr === 'USD' ? '$' : '';
  $amountStr = $sym . number_format($amount, 2) . ' ' . $curr;
  $apptStr   = \Illuminate\Support\Carbon::parse($appointmentDate)->format('l, F j') . ' at ' . $startTime;
@endphp

@extends('mail.layouts.bookready', [
  'preheader' => 'You paid ' . $amountStr . '. You are all set.',
  'eyebrow'   => 'Payment received',
  'headline'  => 'You’re all paid up.',
  'intro'     => 'Hi ' . $customerName . ', thanks for paying the remaining balance for your ' . $serviceName . ' on ' . $apptStr . '. Nothing more to pay at the appointment.',
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:14px 16px;background:#F8F6F2;border-left:3px solid #B8D6BD;font-size:13px;line-height:1.7;color:#121212;">
      <strong style="display:block;margin-bottom:6px;letter-spacing:0.02em;">Amount paid</strong>
      <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.01em;color:#121212;">
        {{ $amountStr }}
      </p>
    </td>
  </tr>
</table>
@endsection

@section('extra')
<p style="margin:0;font-size:13px;line-height:1.55;color:#3A3A3A;">
  See you on {{ \Illuminate\Support\Carbon::parse($appointmentDate)->format('F j') }}!
</p>
@endsection
