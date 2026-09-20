import nodemailer, { Transporter } from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return transporter;
  }

  // Gmail direct service shortcut if GMAIL_USER and GMAIL_APP_PASS provided
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });
    return transporter;
  }

  return null;
}

/**
 * Send an email using SMTP or log to console in development mode.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
  try {
    const mailer = getTransporter();
    const from = process.env.SMTP_FROM || `"EDGELOG Trading OS" <noreply@edgelog.app>`;

    if (mailer) {
      const info = await mailer.sendMail({
        from,
        to,
        subject,
        html,
        text: text || subject,
      });
      console.log(`📧 [Mailer] Email sent to ${to} (MessageId: ${info.messageId})`);
      return true;
    } else {
      console.log(`\n================= 📧 [DEV EMAIL DISPATCH] =================`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Note: Configure SMTP_HOST/SMTP_USER/SMTP_PASS in server/.env for live dispatch.`);
      console.log(`============================================================\n`);
      return true;
    }
  } catch (err: any) {
    console.error(`❌ [Mailer Error] Failed to send email to ${to}:`, err.message);
    return false;
  }
}

/**
 * Send a welcome & account confirmation email
 */
export async function sendWelcomeConfirmationEmail(user: { name: string; email: string }): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0c0f; color: #ecebe6; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background-color: #121317; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #17181d 0%, #1f2330 100%); padding: 30px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ecebe6; }
    .logo-accent { color: #6c9cff; }
    .content { padding: 30px; line-height: 1.6; font-size: 14px; }
    .card { background-color: #17181d; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 18px; margin: 20px 0; }
    .btn { display: inline-block; background-color: #6c9cff; color: #0b0c0f; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 15px; }
    .footer { padding: 20px 30px; text-align: center; font-size: 11px; color: #636876; border-top: 1px solid rgba(255,255,255,0.06); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">EDGE<span class="logo-accent">LOG</span></div>
      <p style="margin: 5px 0 0 0; font-size: 12px; color: #9a9eab; letter-spacing: 0.1em; text-transform: uppercase;">Institutional Trading OS</p>
    </div>
    <div class="content">
      <h2 style="color: #ecebe6; margin-top: 0; font-size: 18px;">Welcome to EDGELOG, ${user.name}! 🚀</h2>
      <p>Your private trader account and cloud vault have been successfully created and confirmed.</p>
      
      <div class="card">
        <div style="font-size: 11px; text-transform: uppercase; color: #6c9cff; font-weight: 600; margin-bottom: 8px;">Account Ready & Activated</div>
        <div style="font-size: 13px; color: #ecebe6;"><strong>Registered Email:</strong> ${user.email}</div>
        <div style="font-size: 13px; color: #ecebe6; margin-top: 4px;"><strong>Primary Trading Portfolio:</strong> Active ($25,000 Starting Balance)</div>
        <div style="font-size: 13px; color: #ecebe6; margin-top: 4px;"><strong>Cashbook & Budget Ledger:</strong> Ready</div>
      </div>

      <p style="color: #9a9eab; font-size: 13px;">You can now log your trades, manage multiple accounts (Prop firm trials, crypto, equities), track rule compliance, and monitor your personal cashflow runway.</p>
      
      <div style="text-align: center;">
        <a href="https://trading-journal-client-xi.vercel.app/" class="btn">Launch EDGELOG Dashboard</a>
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} EDGELOG Trading OS. All rights reserved. Secure Cloud Vault.
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: user.email,
    subject: "Welcome to EDGELOG — Your Trading Account is Confirmed",
    html,
  });
}
