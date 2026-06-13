<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your BookReady site will be removed in 7 days</title>
</head>
<body style="margin:0;padding:0;background:#f8f7f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8f7f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border:1px solid rgba(18,18,18,0.10);">
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#7a7a7a;">BookReady</p>
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;line-height:1.3;color:#1a1a1a;">Your site is about to be removed</h1>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4a4a4a;">Hi {{ $ownerName }},</p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4a4a4a;">
                You started building <strong>{{ $tenantSlug }}.bkrdy.me</strong> on {{ $createdAt->format('M j, Y') }} but never started your free trial. We hold subdomains and resources for 21 days; after that, the site is removed to keep the marketplace clean.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#4a4a4a;">
                <strong>If you want to keep your site, pick a plan in the next 7 days.</strong> Your 14-day trial starts when you add a card. No charge today.
              </p>
              <p style="margin:0 0 24px;">
                <a href="{{ $restoreUrl }}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 24px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">
                  Pick a plan
                </a>
              </p>
              <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#7a7a7a;">
                Not what you wanted? Reply to this email and we will sort it out, or you can let the 7 days run out and the site removes itself.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid rgba(18,18,18,0.06);">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#9a9a9a;">
                Questions? <a href="mailto:{{ $supportEmail }}" style="color:#9a9a9a;text-decoration:underline;">{{ $supportEmail }}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
