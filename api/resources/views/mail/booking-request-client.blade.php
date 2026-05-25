@extends('mail.layouts.bookready', [
  'preheader' => 'We received your booking request for ' . $businessName . '.',
  'eyebrow'   => 'Booking request received',
  'headline'  => 'Thanks, ' . $appt['customer_name'] . '!',
  'intro'     => 'We received your request and ' . $businessName . ' will review and confirm shortly.',
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Service', 'value' => $appt['service_name']])
  @include('mail.partials.kv', ['label' => 'Date',    'value' => \Carbon\Carbon::parse($appt['appointment_date'])->format('l, F j, Y')])
  @include('mail.partials.kv', ['label' => 'Time',    'value' => \Carbon\Carbon::createFromFormat('H:i', $appt['start_time'])->format('g:i A')])
  @include('mail.partials.kv', ['label' => 'Status',  'value' => 'Pending confirmation'])
</table>

@if (! empty($appt['payment_amount']) && $appt['payment_amount'] > 0)
  @php
    $curr  = strtoupper((string) ($appt['currency'] ?? 'USD'));
    $sym   = $curr === 'USD' ? '$' : '';
    $isFul = ($appt['payment_type'] ?? 'deposit') === 'full';
    $due   = $appt['amount_due'] ?? null;
  @endphp
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;background:#F8F6F2;">
    <tr>
      <td style="padding:14px 16px;border-left:3px solid #B8D6BD;">
        <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#0f6f3d;">
          Payment received
        </p>
        <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#121212;letter-spacing:-0.01em;">
          {{ $sym }}{{ number_format($appt['payment_amount'], 2) }} {{ $curr }}
        </p>
        <p style="margin:0;font-size:12px;line-height:1.5;color:#3A3A3A;">
          @if ($isFul)
            Paid in full. Nothing more to pay at your appointment.
          @elseif ($due !== null && $due > 0)
            Deposit paid. Remaining balance of {{ $sym }}{{ number_format($due, 2) }} is due at your appointment.
          @else
            Deposit received.
          @endif
        </p>
      </td>
    </tr>
  </table>
@endif

<div style="margin-top:18px;padding:14px 16px;background:#F8F6F2;border-left:3px solid #E8C7DA;font-size:13px;line-height:1.55;color:#3A3A3A;">
  You&rsquo;ll get another email as soon as your appointment is confirmed. No action needed from you in the meantime.
</div>
@endsection

@if (! empty($appt['manage_url']))
@section('cta')
<a href="{{ $appt['manage_url'] }}" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Manage your booking &rarr;
</a>
@endsection
@endif
