@extends('mail.layouts.bookready', [
  'preheader' => "You're on the waitlist at " . $businessName . ". We'll email you when a spot opens.",
  'eyebrow'   => 'Waitlist confirmation',
  'headline'  => "You're on the waitlist.",
  'intro'     => "Hi " . ($customerName ?: 'there') . ", we'll watch for cancellations in your date range and email you the moment a matching spot opens. The first person to claim it gets the slot, and we'll send you a one-click link.",
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Service',  'value' => $serviceName])
  @include('mail.partials.kv', ['label' => 'Watching', 'value' => \Carbon\Carbon::parse($earliestDate)->format('M j') . ' to ' . \Carbon\Carbon::parse($latestDate)->format('M j, Y')])
</table>
@endsection

@section('extra')
No need to reply. We'll reach out as soon as something opens up. Cancellations happen most often within 24 hours of an appointment, so keep an eye on your inbox.
@endsection
