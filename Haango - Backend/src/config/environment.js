import dotenv from 'dotenv';

dotenv.config();

const getNumber = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
};

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const corsOrigins = (process.env.CORS_ORIGINS || `${clientUrl},http://localhost:5173,http://127.0.0.1:5173`)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  mongodbUri: process.env.MONGODB_URI || '',

  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'dev-refresh-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  otpExpiryMinutes: getNumber('OTP_EXPIRY_MINUTES', 10),
  otpMaxAttempts: getNumber('OTP_MAX_ATTEMPTS', 5),
  otpResendCooldownSeconds: getNumber('OTP_RESEND_COOLDOWN_SECONDS', 30),
  resetTokenExpiryMinutes: getNumber('RESET_TOKEN_EXPIRY_MINUTES', 15),
  accessCookieName: process.env.ACCESS_COOKIE_NAME || 'haango_access_token',
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'haango_refresh_token',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',

  clientUrl,
  callProviderUrl: process.env.CALL_PROVIDER_URL || 'https://meet.jit.si',
  corsOrigins,

  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: getNumber('SMTP_PORT', 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  smtpFrom: process.env.SMTP_FROM || 'no-reply@haango.local',
  smtpFromName: process.env.SMTP_FROM_NAME || 'Haango',
  emailEnabled: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  hostingerMailApiUrl: process.env.HOSTINGER_MAIL_API_URL || 'https://api.mail.hostinger.com',
  hostingerMailApiToken: process.env.HOSTINGER_MAIL_API_TOKEN || '',
  hostingerMailbox: process.env.HOSTINGER_MAILBOX || process.env.SMTP_USER || '',

  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayXKeyId: process.env.RAZORPAYX_KEY_ID || '',
  razorpayXKeySecret: process.env.RAZORPAYX_KEY_SECRET || '',
  razorpayXAccountNumber: process.env.RAZORPAYX_ACCOUNT_NUMBER || '',
  razorpayXWebhookSecret: process.env.RAZORPAYX_WEBHOOK_SECRET || '',

  platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '3'),
  minBookingDuration: parseInt(process.env.MIN_BOOKING_DURATION || '1', 10),
  maxBookingDuration: parseInt(process.env.MAX_BOOKING_DURATION || '8', 10),
};
