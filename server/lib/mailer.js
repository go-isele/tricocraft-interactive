// Email notifications — contact form + new-order alerts to the TrioCraft inbox.
//
// Works immediately with zero setup: if SMTP_HOST/SMTP_USER/SMTP_PASS aren't
// set in .env, it logs the would-be email to the console instead of sending,
// so nothing crashes and nothing is silently lost. Add real SMTP credentials
// (Gmail app password, SendGrid, Mailgun, your host's SMTP, etc.) to .env and
// it starts actually sending — no code changes needed.

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null; // not installed — falls back to console logging below
}

const NOTIFY_TO = process.env.NOTIFY_EMAIL || 'triocraft.brands@gmail.com';
const isConfigured = !!(nodemailer && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * Sends a plain-text notification email. Never throws — logs and resolves
 * either way, so a mail outage never breaks the request that triggered it.
 */
async function notify({ subject, text, replyTo }) {
  if (!isConfigured) {
    console.log('\n[mailer] SMTP not configured — would have sent:');
    console.log(`  To:       ${NOTIFY_TO}`);
    console.log(`  Subject:  ${subject}`);
    console.log(`  Reply-To: ${replyTo || '(none)'}`);
    console.log(`  ---\n${text}\n---\n`);
    console.log('[mailer] Set SMTP_HOST / SMTP_USER / SMTP_PASS in .env to send for real.\n');
    return { sent: false, reason: 'smtp_not_configured' };
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"TrioCraft Website" <${process.env.SMTP_USER}>`,
      to: NOTIFY_TO,
      replyTo: replyTo || undefined,
      subject,
      text,
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Failed to send notification email:', err.message);
    return { sent: false, reason: 'send_failed', error: err.message };
  }
}

module.exports = { notify, isConfigured };
