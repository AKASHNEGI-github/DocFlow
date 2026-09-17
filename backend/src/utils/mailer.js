import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * If SMTP_HOST isn't configured, sendMail() logs the message to the
 * console instead of failing - this is what keeps the forgot-password
 * flow runnable immediately after `npm install`, with no mail provider
 * required, while still being real, wireable SMTP for an actual
 * deployment. Nothing else in the app depends on email working.
 */
const transporter = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
    })
  : null;

export async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    console.log('\n--- SMTP not configured, logging email instead of sending ---');
    console.log(`To: ${to}\nSubject: ${subject}\n\n${text}`);
    console.log('---------------------------------------------------------\n');
    return { delivered: false, loggedOnly: true };
  }

  await transporter.sendMail({ from: env.smtp.from, to, subject, text, html });
  return { delivered: true, loggedOnly: false };
}
