@extends('mail.layouts.bookready', [
  'preheader' => 'New booking request from ' . $appt['customer_name'],
  'eyebrow'   => 'New booking request',
  'headline'  => $appt['customer_name'] . ' wants to book an appointment.',
  'intro'     => 'Heads up — a new request just came in for ' . $businessName . '.',
])

@section('details')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(18,18,18,0.08);border-collapse:collapse;">
  @include('mail.partials.kv', ['label' => 'Service', 'value' => $appt['service_name']])
  @include('mail.partials.kv', ['label' => 'Date',    'value' => \Carbon\Carbon::parse($appt['appointment_date'])->format('l, F j, Y')])
  @include('mail.partials.kv', ['label' => 'Time',    'value' => \Carbon\Carbon::createFromFormat('H:i', $appt['start_time'])->format('g:i A')])
  @if (!empty($appt['customer_email']))
    @include('mail.partials.kv', ['label' => 'Email', 'value' => $appt['customer_email']])
  @endif
  @if (!empty($appt['customer_phone']))
    @include('mail.partials.kv', ['label' => 'Phone', 'value' => $appt['customer_phone']])
  @endif
  @if (!empty($appt['notes']))
    @include('mail.partials.kv', ['label' => 'Notes', 'value' => $appt['notes']])
  @endif
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
          Payment landed in your Stripe
        </p>
        <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#121212;letter-spacing:-0.01em;">
          {{ $sym }}{{ number_format($appt['payment_amount'], 2) }} {{ $curr }}
        </p>
        <p style="margin:0;font-size:12px;line-height:1.5;color:#3A3A3A;">
          @if ($isFul)
            Paid in full. No balance owed at the appointment.
          @elseif ($due !== null && $due > 0)
            Deposit only. Collect the remaining {{ $sym }}{{ number_format($due, 2) }} at the appointment.
          @else
            Deposit received.
          @endif
        </p>
      </td>
    </tr>
  </table>
@endif
@endsection

@section('cta')
<a href="https://app.bkrdy.me/editor/appointments" style="display:inline-block;background:#121212;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 22px;border:1px solid #121212;">
  Review &amp; Confirm &rarr;
</a>
@endsection
