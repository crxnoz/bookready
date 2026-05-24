{{--
  Shared BookReady email layout.

  Variables expected:
    $preheader  string|null   Short summary shown in inbox preview (optional)
    $eyebrow    string|null   Tiny label above the headline (optional)
    $headline   string        Main bold title for the email
    $intro      string|null   One-line intro paragraph (optional)

  Slots:
    @section('details')   Optional sharp-corner card with key/value rows
    @section('cta')       Optional primary CTA block (button via @include('mail.layouts._cta', ...))
    @section('extra')     Optional extra content beneath the CTA
--}}
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="format-detection" content="telephone=no, address=no, email=no">
<title>{{ $headline ?? 'BookReady' }}</title>
</head>
<body style="margin:0;padding:0;background:#F8F6F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;color:#121212;">
@isset($preheader)
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F8F6F2;opacity:0;">{{ $preheader }}</div>
@endisset

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F6F2;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

        {{-- Brand header --}}
        <tr>
          <td style="padding:0 0 20px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#121212;">
              BOOKREADY
            </p>
            <p style="margin:4px 0 0;font-size:11px;color:#6B7280;">
              Booking system for beauty brands
            </p>
          </td>
        </tr>

        {{-- Main card --}}
        <tr>
          <td style="background:#FFFFFF;border:1px solid rgba(18,18,18,0.08);">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

              {{-- Accent bar --}}
              <tr>
                <td style="background:#E8C7DA;height:4px;line-height:4px;font-size:0;">&nbsp;</td>
              </tr>

              {{-- Content --}}
              <tr>
                <td style="padding:36px 32px 32px;">
                  @isset($eyebrow)
                  <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#6B7280;">
                    {{ $eyebrow }}
                  </p>
                  @endisset
                  <h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:700;color:#121212;letter-spacing:-0.01em;">
                    {{ $headline }}
                  </h1>
                  @isset($intro)
                  <p style="margin:14px 0 0;font-size:14px;line-height:1.55;color:#3A3A3A;">
                    {{ $intro }}
                  </p>
                  @endisset

                  @hasSection('details')
                  <div style="margin-top:24px;">
                    @yield('details')
                  </div>
                  @endif

                  @hasSection('cta')
                  <div style="margin-top:28px;">
                    @yield('cta')
                  </div>
                  @endif

                  @hasSection('extra')
                  <div style="margin-top:24px;font-size:13px;line-height:1.55;color:#3A3A3A;">
                    @yield('extra')
                  </div>
                  @endif
                </td>
              </tr>
            </table>
          </td>
        </tr>

        {{-- Footer --}}
        <tr>
          <td style="padding:24px 4px 0;">
            <p style="margin:0;font-size:11px;line-height:1.6;color:#6B7280;">
              Sent by <strong style="color:#121212;font-weight:700;letter-spacing:0.04em;">BookReady</strong> — booking-ready websites, appointments, and payments for beauty brands.
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#9AA0A6;">
              Questions? Reply to this email and we&rsquo;ll help.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
