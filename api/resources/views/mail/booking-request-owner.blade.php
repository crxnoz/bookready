<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New booking request</title>
<style>
  body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { padding: 40px 16px; }
  .card { background: #ffffff; border-radius: 8px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
  .header { background: #18181b; padding: 28px 32px; }
  .header-title { color: #ffffff; font-size: 13px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; margin: 0 0 4px; }
  .header-biz { color: #a1a1aa; font-size: 13px; margin: 0; }
  .body { padding: 32px; }
  .lead { font-size: 18px; font-weight: 700; color: #18181b; margin: 0 0 24px; }
  .detail-table { width: 100%; border-collapse: collapse; }
  .detail-table tr td { padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-size: 14px; }
  .detail-table tr:last-child td { border-bottom: none; }
  .detail-table .label { color: #71717a; width: 40%; }
  .detail-table .value { color: #18181b; font-weight: 500; }
  .cta { display: block; margin: 28px 0 0; background: #18181b; color: #ffffff; text-decoration: none; text-align: center; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; }
  .footer { padding: 20px 32px; border-top: 1px solid #f4f4f5; }
  .footer p { margin: 0; font-size: 12px; color: #a1a1aa; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <p class="header-title">New Booking Request</p>
      <p class="header-biz">{{ $businessName }}</p>
    </div>
    <div class="body">
      <p class="lead">{{ $appt['customer_name'] }} wants to book an appointment.</p>
      <table class="detail-table">
        <tr>
          <td class="label">Service</td>
          <td class="value">{{ $appt['service_name'] }}</td>
        </tr>
        <tr>
          <td class="label">Date</td>
          <td class="value">{{ \Carbon\Carbon::parse($appt['appointment_date'])->format('l, F j, Y') }}</td>
        </tr>
        <tr>
          <td class="label">Time</td>
          <td class="value">{{ \Carbon\Carbon::createFromFormat('H:i', $appt['start_time'])->format('g:i A') }}</td>
        </tr>
        @if (!empty($appt['customer_email']))
        <tr>
          <td class="label">Email</td>
          <td class="value">{{ $appt['customer_email'] }}</td>
        </tr>
        @endif
        @if (!empty($appt['customer_phone']))
        <tr>
          <td class="label">Phone</td>
          <td class="value">{{ $appt['customer_phone'] }}</td>
        </tr>
        @endif
        @if (!empty($appt['notes']))
        <tr>
          <td class="label">Notes</td>
          <td class="value">{{ $appt['notes'] }}</td>
        </tr>
        @endif
      </table>
      <a href="https://app.bkrdy.me/editor/appointments" class="cta">View Appointments</a>
    </div>
    <div class="footer">
      <p>BookReady &middot; notifications@mybookready.com</p>
    </div>
  </div>
</div>
</body>
</html>
