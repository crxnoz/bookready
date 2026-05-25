@php
  $amountStr = number_format($disputeAmount, 2) . ' ' . strtoupper($currency);
  $isWon     = $outcome === 'won';
  $isLost    = $outcome === 'lost';

  $eyebrow  = $isWon ? 'Dispute won' : ($isLost ? 'Dispute lost' : 'Dispute closed');
  $headline = $isWon
    ? 'You won the dispute.'
    : ($isLost ? 'The dispute was lost.' : 'The dispute has been closed.');
  $intro = $isWon
    ? 'Hi ' . $ownerName . ' — Stripe ruled in your favor on the ' . $amountStr . ' chargeback for ' . $businessName . '. The held funds are released back to you.'
    : ($isLost
        ? 'Hi ' . $ownerName . ' — the ' . $amountStr . ' chargeback for ' . $businessName . ' was decided against you. The funds have been reversed and a dispute fee may apply.'
        : 'Hi ' . $ownerName . ' — the dispute on ' . $businessName . ' (' . $amountStr . ') has been closed by Stripe. See your dashboard for details.');
@endphp

@extends('mail.layouts.bookready', [
  'preheader' => $eyebrow . ': ' . $amountStr,
  'eyebrow'   => $eyebrow,
  'headline'  => $headline,
  'intro'     => $intro,
])

@section('cta')
<a href="https://dashboard.stripe.com/disputes" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Open Stripe disputes &rarr;
</a>
@endsection
