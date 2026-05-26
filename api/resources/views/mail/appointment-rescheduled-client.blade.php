@extends('mail.layouts.bookready', [
  'preheader' => 'New time for your ' . $businessName . ' appointment.',
  'eyebrow'   => 'Appointment rescheduled',
  'headline'  => $initiatedBy === 'client' ? 'Your new time is set.' : 'Your appointment was moved.',
  'intro'     => ($customIntro ?? null) ?: ($initiatedBy === 'client'
                  ? ('Here&rsquo;s your updated appointment with ' . $businessName . '.')
                  : ($businessName . ' moved your appointment to a new time. Details below.')),
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Service',  'value' => $appt['service_name']])
  @include('mail.partials.kv', ['label' => 'New date', 'value' => \Carbon\Carbon::parse($appt['appointment_date'])->format('l, F j, Y')])
  @include('mail.partials.kv', ['label' => 'New time', 'value' => \Carbon\Carbon::createFromFormat('H:i', $appt['start_time'])->format('g:i A')])
  @include('mail.partials.kv', [
    'label' => 'Was on',
    'value' => \Carbon\Carbon::parse($oldAppt['appointment_date'])->format('l, F j, Y') . ' at ' . \Carbon\Carbon::createFromFormat('H:i', $oldAppt['start_time'])->format('g:i A'),
  ])
  @include('mail.partials.addons-and-staff', ['appt' => $appt])
</table>
@endsection

@if (! empty($appt['manage_url']))
@section('cta')
<a href="{{ $appt['manage_url'] }}" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Manage your booking &rarr;
</a>
@endsection
@endif

@section('extra')
{{ $initiatedBy === 'client'
    ? 'If you need to change this again or cancel, use the link above. We will see you then.'
    : 'If this new time does not work for you, use the link above to reschedule or reply to this email.' }}
@if (! empty($customSignoff))
<div style="margin-top:14px;">{!! nl2br(e($customSignoff)) !!}</div>
@endif
@endsection
