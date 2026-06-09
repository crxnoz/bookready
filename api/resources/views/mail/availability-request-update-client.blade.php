@php
  $cfg = [
    'approved' => [
      'eyebrow'  => 'Request approved',
      'headline' => "You're booked.",
      'intro'    => "Hi " . ($customerName ?: 'there') . ", good news: " . $businessName . " confirmed your appointment for " . $serviceName . ".",
    ],
    'suggested' => [
      'eyebrow'  => 'New time offered',
      'headline' => 'How about this time?',
      'intro'    => "Hi " . ($customerName ?: 'there') . ", " . $businessName . " couldn't do your exact request but offered an alternative for " . $serviceName . ". Accept it below if it works.",
    ],
    'declined' => [
      'eyebrow'  => 'Request update',
      'headline' => "Couldn't make that one work.",
      'intro'    => "Hi " . ($customerName ?: 'there') . ", " . $businessName . " couldn't fit your request for " . $serviceName . " this time.",
    ],
  ][$outcome] ?? [
    'eyebrow' => 'Request update', 'headline' => 'Update on your request.', 'intro' => 'There is an update on your appointment request.',
  ];
@endphp

@extends('mail.layouts.bookready', [
  'preheader' => $cfg['intro'],
  'eyebrow'   => $cfg['eyebrow'],
  'headline'  => $cfg['headline'],
  'intro'     => $cfg['intro'],
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Service', 'value' => $serviceName])
  @if($outcome === 'suggested' && $suggestedDate)
    @include('mail.partials.kv', ['label' => 'Offered date', 'value' => \Carbon\Carbon::parse($suggestedDate)->format('l, F j, Y') . ($suggestedTime ? ' at ' . \Carbon\Carbon::createFromFormat('H:i', $suggestedTime)->format('g:i A') : '')])
    @include('mail.partials.kv', ['label' => 'You asked for', 'value' => \Carbon\Carbon::parse($preferredDate)->format('M j, Y')])
  @else
    @include('mail.partials.kv', ['label' => 'Date', 'value' => \Carbon\Carbon::parse($preferredDate)->format('l, F j, Y')])
  @endif
  @if($ownerNote)
    @include('mail.partials.kv', ['label' => 'Note', 'value' => $ownerNote])
  @endif
</table>

@if($actionUrl && in_array($outcome, ['suggested', 'approved']))
<div style="text-align:center;margin:24px 0 8px;">
  <a href="{{ $actionUrl }}" style="display:inline-block;background:#121212;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;font-size:11px;">
    {{ $outcome === 'suggested' ? 'Accept this time' : 'View appointment' }}
  </a>
</div>
@endif
@endsection

@section('extra')
@if($outcome === 'declined')
You're welcome to try another date on the booking page anytime.
@elseif($outcome === 'suggested')
This offer is held for you. Accept it to lock in the time before someone else books it.
@endif
@endsection
