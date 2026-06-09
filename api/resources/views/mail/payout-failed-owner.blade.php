@php
  $curr      = strtoupper($currency);
  $sym       = $curr === 'USD' ? '$' : '';
  $amountStr = $sym . number_format($amount, 2) . ' ' . $curr;
@endphp

@extends('mail.layouts.bookready', [
  'preheader' => 'A ' . $amountStr . ' payout to your bank was rejected.',
  'eyebrow'   => 'Action needed',
  'headline'  => 'A payout to your bank failed.',
  'intro'     => 'Hi ' . $ownerName . ', Stripe tried to deposit ' . $amountStr . ' to your bank for ' . $businessName . ' and the bank rejected it. The funds are held in your Stripe balance until you update your account details and Stripe retries the payout.',
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:14px 16px;background:#F8F6F2;border-left:3px solid #C28286;font-size:13px;line-height:1.7;color:#121212;">
      <strong style="display:block;margin-bottom:6px;letter-spacing:0.02em;">Reason from your bank</strong>
      <p style="margin:0;font-size:13px;line-height:1.55;color:#3A3A3A;">
        {{ $failureReason }}
      </p>
    </td>
  </tr>
</table>
@endsection

@section('cta')
<a href="https://dashboard.stripe.com/settings/payouts" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Fix bank details in Stripe &rarr;
</a>
@endsection

@section('extra')
<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#3A3A3A;">
  Most common causes: bank account closed, wrong routing number, account name doesn&rsquo;t match the business name on file, or a hold from your bank.
</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#3A3A3A;">
  Once you update your details, Stripe will automatically retry the payout. The money isn&rsquo;t lost. It&rsquo;s waiting in your Stripe balance.
</p>
@endsection
