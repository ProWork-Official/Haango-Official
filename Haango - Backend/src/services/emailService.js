import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/environment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.resolve(__dirname, '../../public/S_Transparent.png');
const emailClientOrigin = 'http://haango.in';

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

async function sendEmail({ to, subject, text, html, useOfficialSender = false }) {
  const logo = fs.readFileSync(logoPath).toString('base64');
  const apiAttachments = [{
    filename: 'haango-logo.png',
    content: logo,
    contentType: 'image/png',
    cid: 'haango-logo',
  }];

  if (useOfficialSender) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: env.officialEmailUser, pass: env.officialEmailPass },
    });
    await transporter.sendMail({
      from: `${env.smtpFromName} <${env.officialEmailUser}>`,
      to,
      subject,
      text,
      html,
      attachments: [{ filename: 'haango-logo.png', path: logoPath, cid: 'haango-logo' }],
    });
    return;
  }

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

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function formatBookingDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}


export async function sendBookingConfirmationEmails({
  customer,
  buddy,
  activity,
  booking,
}) {
  const clientOrigin = emailClientOrigin;

  const details = {
    activity:
      activity ||
      String(booking.activitySlug || 'Haango booking').replace(/[-_]/g, ' '),

    date: formatBookingDate(booking.date),

    startTime: booking.startTime,

    duration: `${booking.duration} ${
      Number(booking.duration) === 1 ? 'hour' : 'hours'
    }`,

    location: booking.meetingLocation,
  };

  const sendConfirmation = async ({
    recipient,
    recipientName,
    otherName,
    isBuddy,
  }) => {
    if (!recipient) return;

    const title = isBuddy
      ? 'You have a new booking'
      : 'Your booking is confirmed';

    const description = isBuddy
      ? `${otherName} booked you for ${details.activity}.`
      : `Your booking with ${otherName} is confirmed.`;

    const buttonLabel = isBuddy
      ? 'View buddy bookings'
      : 'View my bookings';

    const bookingUrl = `${clientOrigin}/${
      isBuddy ? 'buddy-bookings' : 'bookings'
    }`;

    const safe = Object.fromEntries(
      Object.entries({
        title,
        greeting: `Hello ${recipientName || 'there'},`,
        description,
        activity: details.activity,
        date: details.date,
        startTime: details.startTime,
        duration: details.duration,
        location: details.location,
        buttonLabel,
        bookingUrl,
      }).map(([key, value]) => [key, escapeHtml(value)])
    );

    const subject = isBuddy
      ? `New Haango booking: ${details.activity}`
      : `Haango booking confirmed: ${details.activity}`;

    const text = `
${safe.greeting}

${safe.description}

Activity: ${safe.activity}
Date: ${safe.date}
Time: ${safe.startTime}
Duration: ${safe.duration}
Meeting place: ${safe.location}

View booking: ${bookingUrl}

Regards,
Haango
`.trim();

    const html = `
      <div style="
        margin:0;
        padding:40px 16px;
        background:#f6f8fb;
        font-family:Arial,Helvetica,sans-serif;
      ">
        <div style="
          max-width:520px;
          margin:0 auto;
          background:#fff;
          border:1px solid #e8edf3;
          border-radius:16px;
          overflow:hidden;
        ">

          <!-- Logo -->
          <div style="
            padding:30px 24px 12px;
            text-align:center;
          ">
            <img
              src="cid:haango-logo"
              alt="Haango"
              width="140"
              style="
                display:block;
                width:140px;
                max-width:70%;
                height:auto;
                margin:0 auto;
              "
            />
          </div>

          <!-- Content -->
          <div style="
            padding:12px 32px 32px;
            color:#344054;
          ">

            <h1 style="
              margin:0 0 12px;
              color:#102038;
              font-size:24px;
              line-height:32px;
            ">
              ${safe.title}
            </h1>

            <p style="
              margin:0 0 20px;
              color:#667085;
              line-height:1.6;
            ">
              ${safe.greeting}<br />
              ${safe.description}
            </p>

            <!-- Booking Details -->
            <div style="
              padding:16px;
              border:1px solid #e8edf3;
              border-radius:12px;
              background:#fafbfc;
              line-height:1.8;
            ">
              <strong>${safe.activity}</strong><br />
              ${safe.date} at ${safe.startTime}<br />
              ${safe.duration}<br />
              Meeting place: ${safe.location}
            </div>

            <!-- Button -->
            <p style="
              margin:24px 0;
              text-align:center;
            ">
              <a
                href="${safe.bookingUrl}"
                style="
                  display:inline-block;
                  padding:13px 22px;
                  border-radius:8px;
                  background:#ff7418;
                  color:#fff;
                  text-decoration:none;
                  font-weight:700;
                "
              >
                ${safe.buttonLabel}
              </a>
            </p>

            <!-- Fallback Link -->
            <p style="
              margin:0;
              color:#98a2b3;
              font-size:12px;
              line-height:1.6;
            ">
              If the button does not open, use this link:
              <br />

              <a
                href="${safe.bookingUrl}"
                style="color:#ff7418;"
              >
                ${safe.bookingUrl}
              </a>
            </p>

          </div>

          <!-- Footer -->
          <div style="
            padding:18px 24px;
            background:#fafbfc;
            border-top:1px solid #edf0f4;
            text-align:center;
          ">
            <p style="
              margin:0;
              color:#98a2b3;
              font-size:11px;
            ">
              © ${new Date().getFullYear()} Haango. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    `;

    /*
     * Explicitly use the SMTP configuration from .env.
     *
     * SMTP_HOST=smtp.hostinger.com
     * SMTP_PORT=465
     * SMTP_USER=support@haango.in
     * SMTP_PASS=...
     * SMTP_FROM=support@haango.in
     * SMTP_FROM_NAME=Haango
     */
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `${env.smtpFromName} <${env.smtpFrom}>`,
      to: recipient,
      subject,
      text,
      html,
      attachments: [
        {
          filename: 'haango-logo.png',
          path: logoPath,
          cid: 'haango-logo',
        },
      ],
    });
  };

  const results = await Promise.allSettled([
    // Email to buddy
    sendConfirmation({
      recipient: buddy?.email,
      recipientName: buddy?.name,
      otherName: customer?.name || 'A customer',
      isBuddy: true,
    }),

    // Email to customer
    sendConfirmation({
      recipient: customer?.email,
      recipientName: customer?.name,
      otherName: buddy?.name || 'your buddy',
      isBuddy: false,
    }),
  ]);

  const failures = results.filter(
    (result) => result.status === 'rejected'
  );

  if (failures.length) {
    throw new AggregateError(
      failures.map((failure) => failure.reason),
      'One or more booking confirmation emails failed.'
    );
  }

  return {
    queued: true,
  };
}

const adminCampaignTemplates = [
  {
    id: 'customer_safety',
    title: 'Safety & privacy feature highlight',
    category: 'All customers',
    recipientRole: 'CUSTOMER',
    deliveryMode: 'broadcast',
    subject: 'Your safety is built into every Haango plan',
    angle: 'Explain private in-app chat and OTP check-in/check-out.',
    ctaLabel: 'Read our Safety Guide',
    ctaPath: '/safety',
  },
  {
    id: 'customer_promo',
    title: 'Seasonal / promo code drop',
    category: 'All customers',
    recipientRole: 'CUSTOMER',
    deliveryMode: 'broadcast',
    subject: 'A little credit for your next Haango plan',
    angle: 'Share a time-bound promo code for an activity booking.',
    ctaLabel: 'Claim your ₹100 credit',
    ctaPath: '/explore',
    variables: ['promoCode', 'promoExpiry'],
  },
  {
    id: 'customer_how_it_works',
    title: 'How Haango works',
    category: 'All customers',
    recipientRole: 'CUSTOMER',
    deliveryMode: 'broadcast',
    subject: 'Make plans around activities, not expectations',
    angle: 'Clarify that Haango is activity-first, not a dating app or a long-term commitment.',
    ctaLabel: 'Explore activities',
    ctaPath: '/explore',
  },
  {
    id: 'buddy_booking_tips',
    title: 'Pro tips: improve your bookings',
    category: 'All buddies',
    recipientRole: 'BUDDY',
    deliveryMode: 'broadcast',
    subject: 'Small profile improvements can bring more bookings',
    angle: 'Actionable advice for profile photos, bios, and quick chat replies.',
    ctaLabel: 'Update your profile',
    ctaPath: '/buddy-dashboard',
  },
  {
    id: 'buddy_referral_bonus',
    title: 'Buddy referral & wallet bonus',
    category: 'All buddies',
    recipientRole: 'BUDDY',
    deliveryMode: 'broadcast',
    subject: 'Invite a buddy and earn a referral bonus',
    angle: 'Invite verified friends with the BUDDYBONUS75 referral offer.',
    ctaLabel: 'Share your referral link',
    ctaPath: '/signup',
  },
  {
    id: 'customer_abandoned_booking',
    title: 'Incomplete booking reminder',
    category: 'Triggered customer reminders',
    recipientRole: 'CUSTOMER',
    deliveryMode: 'triggered',
    subject: 'Did something interrupt your plan? Your companion is waiting!',
    angle: 'Send to customers with a pending payment booking created 30 minutes to 7 days ago.',
    ctaLabel: 'Continue exploring',
    ctaPath: '/explore',
    trigger: 'abandoned_booking',
  },
  {
    id: 'customer_inactivity',
    title: '14-day re-engagement nudge',
    category: 'Triggered customer reminders',
    recipientRole: 'CUSTOMER',
    deliveryMode: 'triggered',
    subject: "We miss you! Here's a discount on your next café run.",
    angle: 'Send to active customer accounts whose last-seen date is at least 14 days ago.',
    ctaLabel: 'Find your next plan',
    ctaPath: '/explore',
    trigger: 'inactive_14_days',
    variables: ['promoCode', 'promoExpiry'],
  },
  {
    id: 'buddy_profile_incomplete',
    title: 'Incomplete profile / pending verification',
    category: 'Triggered buddy reminders',
    recipientRole: 'BUDDY',
    deliveryMode: 'triggered',
    subject: "You're 1 step away from accepting paid bookings on Haango!",
    angle: 'Send to buddies without a profile, with an incomplete profile, or with pending verification.',
    ctaLabel: 'Complete your profile',
    ctaPath: '/buddy-dashboard',
    trigger: 'buddy_profile_incomplete',
  },
  {
    id: 'buddy_milestone',
    title: 'Repeat booking milestone',
    category: 'Triggered buddy milestones',
    recipientRole: 'BUDDY',
    deliveryMode: 'triggered',
    subject: 'Your booking milestone on Haango',
    angle: 'Celebrate buddies at 5, 10, or 18 completed bookings.',
    ctaLabel: 'View your buddy dashboard',
    ctaPath: '/buddy-dashboard',
    trigger: 'buddy_milestone',
    variables: ['milestone'],
  },
];

export function getAdminCampaignTemplates() {
  return adminCampaignTemplates.map(({ id, title, category, recipientRole, deliveryMode, subject, angle, ctaLabel, trigger, variables = [] }) => ({
    id, title, category, recipientRole, deliveryMode, subject, angle, ctaLabel, trigger, variables,
  }));
}

function getCampaignCopy(templateId, recipientName, variables) {
  const greeting = `Hello ${recipientName || 'there'},`;
  const promoCode = String(variables.promoCode || 'WELCOME100').trim();
  const referralCode = String(variables.referralCode || '').trim();
  const milestone = [5, 10, 18].includes(Number(variables.milestone)) ? Number(variables.milestone) : 10;

  const copy = {
    customer_safety: {
      title: 'Good plans feel safer',
      paragraphs: ['Keep conversations in Haango chat so you do not need to share your phone number.', 'Use the OTP check-in and check-out steps to confirm the start and end of your activity.'],
    },
    customer_promo: {
      title: 'Your next plan comes with a little extra',
      paragraphs: [`Use code ${promoCode} to claim ₹100 credit on an eligible Haango booking. Promo availability and terms apply.`],
      callout: `Your promo code: ${promoCode}`,
    },
    customer_how_it_works: {
      title: 'Activities come first',
      paragraphs: ['Haango helps you find a companion for a real activity, like a café visit, movie, or local outing.', 'There is no dating expectation or long-term commitment. Choose an activity, find a buddy, and make a plan that works for you.'],
    },
    buddy_booking_tips: {
      title: 'Make your profile work harder',
      paragraphs: ['Choose clear, recent photos that show your personality. Write a specific bio that helps people picture the activity you enjoy.', 'Reply promptly to in-app chats and keep your availability current so customers can plan with confidence.'],
    },
    buddy_referral_bonus: {
      title: 'Grow the Haango buddy community',
      paragraphs: ['Invite friends who would make thoughtful, reliable buddies. Once they complete verification, eligible referrals can earn the BUDDYBONUS75 wallet bonus. Terms apply.', 'Share your signup link and referral code with friends who are a good fit for the Haango community.'],
      callout: referralCode ? `Your referral code: ${referralCode}` : 'Referral offer: BUDDYBONUS75',
    },
    customer_abandoned_booking: {
      title: 'Your plan is still waiting',
      paragraphs: ['Did something interrupt your booking? The activity you started looking at is still a great way to spend time together.', 'Pick up where you left off and check availability before your preferred time is gone.'],
    },
    customer_inactivity: {
      title: 'It has been a while',
      paragraphs: [`We would love to help with your next café run. Use code ${promoCode} for ₹100 credit on an eligible booking. Terms apply.`, 'Browse activities and choose a plan that fits your day.'],
      callout: `Your promo code: ${promoCode}`,
    },
    buddy_profile_incomplete: {
      title: 'Finish setting up your buddy profile',
      paragraphs: ['You are one step away from being ready to accept paid bookings. Add the required profile details and photos, then complete verification.', 'Once your profile is approved, customers can find you for activities.'],
    },
    buddy_milestone: {
      title: `You just reached ${milestone} completed bookings!`,
      paragraphs: ['Thank you for helping customers make good memories with Haango. Keep your profile and availability up to date as you work toward the next milestone.'],
      callout: `${milestone} completed bookings`,
    },
  }[templateId];

  return { greeting, ...copy };
}

export async function sendAdminCampaignEmail({ templateId, recipient, recipientName, variables = {} }) {
  if (!env.officialEmailUser || !env.officialEmailPass) {
    const error = new Error('Campaign email is not configured. Set HAANGO_OFFICIAL_USER and HAANGO_OFFICIAL_PASS in the backend environment.');
    error.statusCode = 503;
    error.isOperational = true;
    throw error;
  }

  const template = adminCampaignTemplates.find((item) => item.id === templateId);
  if (!template) {
    const error = new Error('Select a valid email template.');
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  const copy = getCampaignCopy(templateId, recipientName, variables);
  const subject = templateId === 'buddy_milestone'
    ? `🔥 You just hit ${[5, 10, 18].includes(Number(variables.milestone)) ? Number(variables.milestone) : 10} completed bookings! Keep it up.`
    : template.subject;
  const referralPath = templateId === 'buddy_referral_bonus' && variables.referralCode
    ? `/signup?signupCode=${encodeURIComponent(variables.referralCode)}`
    : template.ctaPath;
  const ctaUrl = new URL(referralPath, `${emailClientOrigin}/`).toString();
  const safe = {
    greeting: escapeHtml(copy.greeting),
    title: escapeHtml(copy.title),
    paragraphs: copy.paragraphs.map(escapeHtml),
    callout: copy.callout ? escapeHtml(copy.callout) : '',
    ctaLabel: escapeHtml(template.ctaLabel),
    ctaUrl: escapeHtml(ctaUrl),
  };
  const text = [
    safe.greeting,
    '',
    ...safe.paragraphs,
    safe.callout ? `\n${safe.callout}` : '',
    `\n${template.ctaLabel}: ${ctaUrl}`,
    '',
    'Haango',
  ].filter(Boolean).join('\n');
  const html = `
    <div style="margin:0;padding:36px 16px;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#344054">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e8edf3;border-radius:16px;overflow:hidden">
        <div style="padding:28px 24px 14px;text-align:center"><img src="cid:haango-logo" alt="Haango" width="145" style="display:block;width:145px;max-width:70%;height:auto;margin:0 auto" /></div>
        <div style="padding:12px 32px 32px">
          <p style="margin:0 0 12px;color:#667085;font-size:14px">${safe.greeting}</p>
          <h1 style="margin:0 0 16px;color:#102038;font-size:25px;line-height:1.3">${safe.title}</h1>
          ${safe.paragraphs.map((paragraph) => `<p style="margin:0 0 14px;color:#475467;font-size:15px;line-height:1.7">${paragraph}</p>`).join('')}
          ${safe.callout ? `<div style="margin:22px 0;padding:16px;border:1px solid #ffe1cc;border-radius:12px;background:#fff5ed;text-align:center;color:#c84c13;font-size:18px;font-weight:700">${safe.callout}</div>` : ''}
          <p style="margin:26px 0 0;text-align:center"><a href="${safe.ctaUrl}" style="display:inline-block;padding:13px 22px;border-radius:8px;background:#ff7418;color:#fff;text-decoration:none;font-weight:700">${safe.ctaLabel}</a></p>
        </div>
        <div style="padding:18px 24px;background:#fafbfc;border-top:1px solid #edf0f4;text-align:center"><p style="margin:0;color:#98a2b3;font-size:11px;line-height:1.6">© ${new Date().getFullYear()} Haango. All rights reserved.</p></div>
      </div>
    </div>
  `;

  await sendEmail({ to: recipient, subject, text, html, useOfficialSender: true });
  return { subject };
}

