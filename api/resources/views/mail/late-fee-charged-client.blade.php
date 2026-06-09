@php
  $curr      = strtoupper($currency);
  $sym       = $curr === 'USD' ? '$' : '';
  $amountStr = $sym . number_format($amount, 2) . ' ' . $curr;
  $apptStr   = \Illuminate\Support\Carbon::parse($appointmentDate)->format('l, F j') . ' at ' . $startTime;
  $isNoShow  = $feeType === 'no_show';
@endphp

@extends('mail.layouts.bookready', [
  'preheader' => ($isNoShow ? 'No-show fee: ' : 'Late-cancel fee: ') . $amountStr,
  'eyebrow'   => $isNoShow ? 'No-show fee' : 'Late-cancel fee',
  'headline'  => $isNoShow ? 'A no-show fee was charged.' : 'A late-cancellation fee was charged.',
  'intro'     => 'Hi ' . $customerName . ', ' . $businessName . ' has charged ' . $amountStr . ' to the card on file for your ' . $serviceName . ' on ' . $apptStr . '.',
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:14px 16px;background:#F8F6F2;border-left:3px solid #C28286;font-size:13px;line-height:1.7;color:#121212;">
      <strong style="display:block;margin-bottom:6px;letter-spacing:0.02em;">Amount charged</strong>
      <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.01em;color:#121212;">
        {{ $amountStr }}
      </p>
    </td>
  </tr>
</table>
@endsection

@section('extra')
<p style="margin:0;font-size:13px;line-height:1.55;color:#3A3A3A;">
  If you believe this charge is in error, reply to this email and {{ $businessName }} will sort it out.
</p>
@endsection
