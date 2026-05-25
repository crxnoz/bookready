@php
  $amountStr = number_format($refundAmount, 2) . ' ' . strtoupper($currency);
  $apptStr   = \Illuminate\Support\Carbon::parse($appointmentDate)->format('l, F j') . ' at ' . $startTime;
@endphp

@extends('mail.layouts.bookready', [
  'preheader' => ($isFullRefund ? 'Refund issued: ' : 'Partial refund issued: ') . $amountStr,
  'eyebrow'   => $isFullRefund ? 'Refund issued' : 'Partial refund',
  'headline'  => $isFullRefund ? 'Your refund is on the way.' : 'A partial refund is on the way.',
  'intro'     => 'Hi ' . $customerName . ' — ' . $businessName . ' has issued a refund of ' . $amountStr . ' for your ' . $serviceName . ' booking on ' . $apptStr . '.',
])

@section('extra')
<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#3A3A3A;">
  Most card refunds take 5&ndash;10 business days to appear on your statement, depending on your bank.
</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#3A3A3A;">
  Questions about this refund? Reply to this email and {{ $businessName }} will help.
</p>
@endsection
