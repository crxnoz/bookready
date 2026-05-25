@php
  $apptStr = \Illuminate\Support\Carbon::parse($appointmentDate)->format('l, F j') . ' at ' . $startTime;
@endphp

@extends('mail.layouts.bookready', [
  'preheader' => 'Loved your visit? Leave ' . $businessName . ' a tip.',
  'eyebrow'   => 'Thank you',
  'headline'  => 'Loved your visit?',
  'intro'     => 'Hi ' . $customerName . ' — thanks for visiting ' . $businessName . ' for your ' . $serviceName . ' on ' . $apptStr . '. If you&rsquo;d like to leave a tip, the link below takes you straight there.',
])

@section('cta')
<a href="{{ $tipUrl }}" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Leave a tip &rarr;
</a>
@endsection

@section('extra')
<p style="margin:0;font-size:13px;line-height:1.55;color:#3A3A3A;">
  Tips go directly to {{ $businessName }} through Stripe. No pressure &mdash; this is entirely optional.
</p>
@endsection
