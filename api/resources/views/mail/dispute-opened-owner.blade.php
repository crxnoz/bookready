@php
  $amountStr = number_format($disputeAmount, 2) . ' ' . strtoupper($currency);
  $reasonStr = \Illuminate\Support\Str::of($reason)->replace('_', ' ')->title();
  $dueStr    = $evidenceDueBy
    ? \Illuminate\Support\Carbon::createFromTimestamp($evidenceDueBy)->format('l, F j')
    : null;
@endphp

@extends('mail.layouts.bookready', [
  'preheader' => 'A customer disputed ' . $amountStr . '. You have time-limited to respond in Stripe.',
  'eyebrow'   => 'Action needed',
  'headline'  => 'A payment was disputed.',
  'intro'     => 'Hi ' . $ownerName . ' — a customer of ' . $businessName . ' has filed a chargeback for ' . $amountStr . '. Stripe will hold the funds until the dispute is resolved.',
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:14px 16px;background:#F8F6F2;border-left:3px solid #C28286;font-size:13px;line-height:1.7;color:#121212;">
      <strong style="display:block;margin-bottom:6px;letter-spacing:0.02em;">Dispute summary</strong>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="color:#3A3A3A;">
        <tr><td style="padding-right:12px;">Amount</td><td><strong style="color:#121212;">{{ $amountStr }}</strong></td></tr>
        <tr><td style="padding-right:12px;">Reason</td><td>{{ $reasonStr }}</td></tr>
        @if ($dueStr)
        <tr><td style="padding-right:12px;">Respond by</td><td><strong style="color:#121212;">{{ $dueStr }}</strong></td></tr>
        @endif
      </table>
    </td>
  </tr>
</table>
@endsection

@section('cta')
<a href="https://dashboard.stripe.com/disputes" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Respond in Stripe &rarr;
</a>
@endsection

@section('extra')
<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#3A3A3A;">
  Open the dispute in Stripe and submit evidence (receipts, communication, the booking record) before the deadline. If you don&rsquo;t respond, the dispute is automatically lost.
</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#3A3A3A;">
  If you recognize the customer and want to refund instead, that closes the dispute as &ldquo;won&rdquo; with no fee.
</p>
@endsection
