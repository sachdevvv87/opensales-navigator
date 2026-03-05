import nodemailer from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

export async function sendEmail(
  smtp: SmtpConfig,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.password },
  });

  await transporter.sendMail({ from: smtp.from, to, subject, html });
  transporter.close();
}

export function buildNotificationEmailHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#0f172a;padding:20px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.5px;">OpenSales Navigator</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">${title}</h2>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#475569;">${body}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                You are receiving this because you have email notifications enabled in OpenSales Navigator.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
