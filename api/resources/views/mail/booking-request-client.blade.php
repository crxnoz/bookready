<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Booking request received</title>
<style>
  body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { padding: 40px 16px; }
  .card { background: #ffffff; border-radius: 8px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
  .header { background: #18181b; padding: 28px 32px; }
  .header-title { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 4px; }
  .header-biz { color: #a1a1aa; font-size: 13px; margin: 0; }
  .body { padding: 32px; }
  .lead { font-size: 15px; color: #3f3f46; margin: 0 0 24px; line-height: 1.6; }
  .detail-table { width: 100%; border-collapse: collapse; }
  .detail-table tr td { padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-size: 14px; }
  .detail-table tr:last-child td { border-bottom: none; }
  .detail-table .label { color: #71717a; width: 40%; }
  .detail-table .value { color: #18181b; font-weight: 500; }
  .status-note { margin: 24px 0 0; padding: 14px 16px; background: #fafafa; border-left: 3px solid #d4d4d8; border-radius: 4px; font-size: 13px; color: #52525b; line-height: 1.5; }
  .footer { padding: 20px 32px; border-top: 1px solid #f4f4f5; }
  .footer p { margin: 0; font-size: 12px; color: #a1a1aa; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <p class="header-title">Booking request received</p>
      <p class="header-biz">{{ $businessName }}</p>
    </div>
    <div class="body">
      <p class="lead">Hi {{ $appt['customer_name'] }}, thanks for requesting an appointment with <strong>{{ $businessName }}</strong>.</p>
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
        <tr>
          <td class="label">Status</td>
          <td class="value">Pending confirmation</td>
        </tr>
      </table>
      <p class="status-note">Your request is pending. The business will review and confirm your appointment shortly. You'll receive another email once it's confirmed.</p>
    </div>
    <div class="footer">
      <p>BookReady &middot; notifications@mybookready.com</p>
    </div>
  </div>
</div>
</body>
</html>
