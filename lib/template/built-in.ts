export const BUILT_IN_TEMPLATE_ID = "built_in_welcome";

export const builtInTemplate = {
  id: BUILT_IN_TEMPLATE_ID,
  name: "A warm welcome",
  subject: "Welcome — we’re glad you’re here",
  description: "A polished, responsive welcome email ready to make your own.",
  html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Welcome</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; }
    table { border-collapse: collapse; border-spacing: 0; }
    img { border: 0; display: block; max-width: 100%; }
    @media only screen and (max-width: 620px) {
      .email-shell { width: 100% !important; }
      .email-content { padding: 36px 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Everything you need to get started.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="email-shell" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="height:8px;background:#18181b;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td class="email-content" style="padding:52px 48px;">
              <p style="margin:0 0 28px;font-size:13px;line-height:20px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">Your company</p>
              <h1 style="margin:0 0 18px;font-size:36px;line-height:42px;letter-spacing:-0.03em;color:#18181b;">Welcome aboard.</h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#52525b;">Thanks for joining us. We built this experience to keep the important things simple and help you get value from day one.</p>
              <p style="margin:0 0 32px;font-size:16px;line-height:26px;color:#52525b;">Take a minute to explore your account, then reach out whenever you need a hand.</p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:7px;background:#18181b;">
                    <a href="https://example.com" style="display:inline-block;padding:13px 20px;font-size:14px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;">Get started</a>
                  </td>
                </tr>
              </table>
              <div style="height:40px;line-height:40px;">&nbsp;</div>
              <div style="height:1px;background:#e4e4e7;font-size:0;line-height:0;">&nbsp;</div>
              <p style="margin:24px 0 0;font-size:13px;line-height:21px;color:#71717a;">Questions? Reply to this email and a real person will help.</p>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font-size:11px;line-height:18px;color:#a1a1aa;">Your company · 123 Main Street · Your City</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
} as const;
