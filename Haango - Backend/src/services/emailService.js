import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/environment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.resolve(__dirname, '../../public/S_Transparent.png');

// --------------------------------------------------
// SMTP Transporter
// --------------------------------------------------

function createTransporter() {
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    requireTLS: env.smtpPort !== 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
}

let hostingerMailboxResourceId;

async function getHostingerMailboxResourceId() {
  if (hostingerMailboxResourceId) return hostingerMailboxResourceId;

  const response = await fetch(`${env.hostingerMailApiUrl}/api/v1/me`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${env.hostingerMailApiToken}`,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || 'Unable to access the Hostinger Mail API.');
    error.statusCode = 503;
    error.errorCode = payload.code || 'HOSTINGER_MAIL_API_UNAVAILABLE';
    error.isOperational = true;
    throw error;
  }

  const mailbox = payload.data?.mailboxes?.find(
    (item) => item.address?.toLowerCase() === env.hostingerMailbox.toLowerCase()
  );

  if (!mailbox?.resourceId) {
    const error = new Error(`Hostinger API token cannot access ${env.hostingerMailbox}.`);
    error.statusCode = 503;
    error.errorCode = 'HOSTINGER_MAILBOX_NOT_ACCESSIBLE';
    error.isOperational = true;
    throw error;
  }

  hostingerMailboxResourceId = mailbox.resourceId;
  return hostingerMailboxResourceId;
}

async function sendWithHostingerMailApi({ to, subject, text, html, attachments }) {
  const mailboxResourceId = await getHostingerMailboxResourceId();
  const response = await fetch(
    `${env.hostingerMailApiUrl}/api/v1/mailboxes/${encodeURIComponent(mailboxResourceId)}/send`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${env.hostingerMailApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [to],
        displayName: env.smtpFromName,
        subject,
        text,
        html,
        attachments,
      }),
    },
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || 'Hostinger Mail API rejected the email.');
    error.statusCode = 503;
    error.errorCode = payload.code || 'HOSTINGER_MAIL_SEND_FAILED';
    error.isOperational = true;
    throw error;
  }
}

async function sendEmail({ to, subject, text, html }) {
  const logo = fs.readFileSync(logoPath).toString('base64');
  const apiAttachments = [{
    filename: 'haango-logo.png',
    content: logo,
    contentType: 'image/png',
    cid: 'haango-logo',
  }];

  if (env.hostingerMailApiToken && env.hostingerMailApiToken !== 'PASTE_HOSTINGER_MAIL_API_TOKEN_HERE') {
    await sendWithHostingerMailApi({ to, subject, text, html, attachments: apiAttachments });
    return;
  }

  if (!env.emailEnabled) {
    console.warn(`[EMAIL] No email provider configured. OTP for ${to} would be sent.`);
    return;
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `${env.smtpFromName} <${env.smtpFrom}>`,
    to,
    subject,
    text,
    html,
    attachments: [{ filename: 'haango-logo.png', path: logoPath, cid: 'haango-logo' }],
  });
}

// --------------------------------------------------
// Shared Email Styles
// --------------------------------------------------

function createEmailLayout({
  title,
  greeting,
  description,
  codeLabel,
  otpCode,
  expiryMinutes,
  securityNote,
}) {
  return `
    <div style="
      margin: 0;
      padding: 40px 16px;
      background-color: #f6f8fb;
      font-family: Arial, Helvetica, sans-serif;
    ">
      <div style="
        max-width: 520px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 20px;
        overflow: hidden;
        border: 1px solid #e8edf3;
        box-shadow: 0 8px 30px rgba(16, 32, 56, 0.08);
      ">

        <!-- Header / Logo -->
        <div style="
          padding: 34px 24px 24px;
          text-align: center;
          background-color: #ffffff;
        ">
          <img
            src="cid:haango-logo"
            alt="Haango"
            width="150"
            style="
              display: block;
              width: 150px;
              max-width: 70%;
              height: auto;
              margin: 0 auto;
              border: 0;
              outline: none;
              text-decoration: none;
            "
          />
        </div>

        <!-- Main Content -->
        <div style="
          padding: 10px 40px 38px;
          text-align: center;
        ">

          <h1 style="
            margin: 0 0 12px;
            color: #102038;
            font-size: 26px;
            line-height: 34px;
            font-weight: 700;
          ">
            ${title}
          </h1>

          <p style="
            margin: 0 auto 28px;
            max-width: 390px;
            color: #667085;
            font-size: 15px;
            line-height: 24px;
          ">
            ${greeting}<br />
            ${description}
          </p>

          <!-- OTP Box -->
          <div style="
            background-color: #fff5ed;
            border: 1px solid #ffe1cc;
            border-radius: 14px;
            padding: 22px 16px;
            margin: 0 auto 22px;
          ">

            <div style="
              color: #98a2b3;
              font-size: 11px;
              line-height: 16px;
              font-weight: 700;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              margin-bottom: 8px;
            ">
              ${codeLabel}
            </div>

            <div style="
              color: #ff7418;
              font-size: 34px;
              line-height: 42px;
              font-weight: 700;
              letter-spacing: 7px;
              padding-left: 7px;
            ">
              ${otpCode}
            </div>

          </div>

          <!-- Expiry -->
          <p style="
            margin: 0 0 26px;
            color: #667085;
            font-size: 13px;
            line-height: 20px;
          ">
            This code expires in
            <strong style="color: #344054;">
              ${expiryMinutes} minutes
            </strong>.
          </p>

          <!-- Security Note -->
          <div style="
            border-top: 1px solid #edf0f4;
            padding-top: 22px;
          ">
            <p style="
              margin: 0;
              color: #98a2b3;
              font-size: 12px;
              line-height: 19px;
            ">
              ${securityNote}
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div style="
          padding: 18px 24px;
          background-color: #fafbfc;
          border-top: 1px solid #edf0f4;
          text-align: center;
        ">
          <p style="
            margin: 0;
            color: #98a2b3;
            font-size: 11px;
            line-height: 17px;
          ">
            © ${new Date().getFullYear()} Haango. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  `;
}

// --------------------------------------------------
// Send OTP Email
// --------------------------------------------------

export async function sendOtpEmail(
  email,
  otpCode,
  { name, purpose = 'signup' } = {}
) {
  const subject =
    purpose === 'signup'
      ? 'Verify your Haango account'
      : 'Your Haango security code';

  const html = createEmailLayout({
    title: 'Verify your email',

    greeting: `Hello ${name || 'there'},`,

    description:
      'Use the verification code below to continue with your Haango account.',

    codeLabel: 'Verification Code',

    otpCode,

    expiryMinutes: env.otpExpiryMinutes,

    securityNote:
      "If you didn't request this verification code, you can safely ignore this email.",
  });

  await sendEmail({
    to: email,
    subject,
    text: `Hello ${name || 'there'}, your Haango verification code is ${otpCode}. It expires in ${env.otpExpiryMinutes} minutes.`,
    html,
  });

  return {
    queued: true,
  };
}

// --------------------------------------------------
// Send Password Reset Email
// --------------------------------------------------

export async function sendPasswordResetEmail(
  email,
  otpCode,
  { name } = {}
) {
  const html = createEmailLayout({
    title: 'Reset your password',

    greeting: `Hello ${name || 'there'},`,

    description:
      'We received a request to reset the password for your Haango account.',

    codeLabel: 'Password Reset Code',

    otpCode,

    expiryMinutes:
      env.resetTokenExpiryMinutes || env.otpExpiryMinutes,

    securityNote:
      "If you didn't request a password reset, you can safely ignore this email. Your password will not be changed unless this code is used.",
  });

  await sendEmail({
    to: email,
    subject: 'Reset your Haango password',
    text: `Hello ${name || 'there'}, your Haango password reset code is ${otpCode}. It expires in ${env.resetTokenExpiryMinutes || env.otpExpiryMinutes} minutes.`,
    html,
  });

  return {
    queued: true,
  };
}
