import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import User from '../models/User.js';
import OtpRequest from '../models/OtpRequest.js';
import RefreshToken from '../models/RefreshToken.js';
import { env } from '../config/environment.js';
import { badRequest, unauthorized } from '../utils/errors.js';
import { normalizeEmail } from '../utils/helpers.js';
import { sendOtpEmail, sendPasswordResetEmail } from './emailService.js';
import { ensureCustomerWallet } from './customerWalletService.js';
import { redeemCoupon } from './couponService.js';
import { findAvailableCoupon } from './couponService.js';
import mongoose from 'mongoose';

function makeReferralCode(name = '') {
  const prefix = String(name).replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase() || 'USER';
  return `${prefix}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function createReferralCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeReferralCode('USER');
    if (!await User.exists({ referralCode: code })) return code;
  }
  throw badRequest('Unable to create a referral code. Please try again.', 'REFERRAL_CODE_ERROR');
}

export async function ensureReferralCode(user) {
  if (user.referralCode) return user;
  user.referralCode = await createReferralCode();
  await user.save();
  return user;
}

function signToken(userId, secret = env.jwtSecret, expiresIn = env.jwtExpiresIn) {
  return jwt.sign({ userId }, secret, { expiresIn });
}

function hashTokenValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function normalizeRole(rawRole) {
  const role = String(rawRole ?? '').trim().toUpperCase();
  if (role === 'CUSTOMER' || role === 'BUDDY' || role === 'ADMIN') return role;
  if (role === 'CUSTOMER_ACCOUNT') return 'CUSTOMER';
  if (role === 'BUDDY_ACCOUNT') return 'BUDDY';
  if (role === 'USER') return 'CUSTOMER';
  return 'CUSTOMER';
}

export function isLoginOtpRequired(userRecord, now = new Date()) {
  if (!userRecord) return false;
  if (userRecord.requiresOtpReauth) return true;

  if (!userRecord.lastSeenAt) return true;

  const inactiveMs = now.getTime() - new Date(userRecord.lastSeenAt).getTime();
  return inactiveMs >= 30 * 24 * 60 * 60 * 1000;
}

export function getBootstrapAdminUsers() {
  return [
    {
      name: 'Ayush Jaiswal',
      email: 'ayushjaiswal2425@gmail.com',
      password: 'jaIswAl2524',
      phone: '+919999999999',
      role: 'MASTER_ADMIN',
      adminLevel: 3,
    },
    {
      name: 'Harshika Yadav',
      email: 'harshikayadav2425@gmail.com',
      password: 'yAdaV5242',
      phone: '+919999999998',
      role: 'MASTER_ADMIN',
      adminLevel: 3,
    },
  ];
}

export async function ensureBootstrapAdminUsers() {
  const admins = getBootstrapAdminUsers();

  for (const admin of admins) {
    const normalizedEmail = normalizeEmail(admin.email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (existingUser.role !== 'MASTER_ADMIN') {
        existingUser.role = 'MASTER_ADMIN';
        existingUser.adminLevel = 3;
        existingUser.isActive = true;
        existingUser.isVerified = true;
        await existingUser.save();
      }
      continue;
    }

    const passwordHash = await User.hashPassword(admin.password);
    await User.create({
      name: admin.name,
      email: normalizedEmail,
      phone: admin.phone,
      passwordHash,
      role: admin.role,
      adminLevel: admin.adminLevel,
      isActive: true,
      isVerified: true,
    });
  }
}

export const authCookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: '/',
};

export function issueAuthCookies(res, accessToken, refreshToken) {
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  res.cookie(env.accessCookieName, accessToken, {
    ...authCookieOptions,
    expires: accessExpires,
  });

  res.cookie(env.refreshCookieName, refreshToken, {
    ...authCookieOptions,
    expires: refreshExpires,
  });
}

export async function requestSignupOtp({ name, email, phone, password, role, signupCode }) {
  const finalEmail = normalizeEmail(email);
  const finalRole = normalizeRole(role);

  if (!name || !finalEmail || !phone || !password) {
    throw badRequest('Missing signup information', 'MISSING_SIGNUP_DATA');
  }

  const existing = await User.findOne({ email: finalEmail });
  if (existing) throw badRequest('Email already registered', 'EMAIL_EXISTS');

  const otpCode = generateOtpCode();
  const otpHash = await OtpRequest.hashCode(otpCode);
  const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

  await OtpRequest.findOneAndUpdate(
    { email: finalEmail, purpose: 'SIGNUP' },
    {
      email: finalEmail,
      purpose: 'SIGNUP',
      codeHash: otpHash,
      expiresAt,
      attempts: 0,
      consumedAt: null,
      $setOnInsert: { ipHash: '' },
    },
    { upsert: true, new: true }
  );

  await sendOtpEmail(finalEmail, otpCode, { name, purpose: 'signup' });

  return {
    message: 'OTP sent to your email. Please verify it to complete signup.',
    expiresInMinutes: env.otpExpiryMinutes,
    role: finalRole,
  };
}

export async function signupUser({ name, email, phone, password, role, otp, signupCode, referralCode, couponCode }) {
  const finalEmail = normalizeEmail(email);
  const finalRole = normalizeRole(role);

  const existing = await User.findOne({ email: finalEmail });
  if (existing) throw badRequest('Email already registered', 'EMAIL_EXISTS');

  const otpRequest = await OtpRequest.findOne({ email: finalEmail, purpose: 'SIGNUP' }).select('+codeHash');
  if (!otpRequest) throw badRequest('Signup OTP has not been requested', 'OTP_NOT_REQUESTED');
  if (new Date(otpRequest.expiresAt).getTime() < Date.now()) {
    throw badRequest('OTP expired. Please request a new one.', 'OTP_EXPIRED');
  }

  if (otpRequest.attempts >= env.otpMaxAttempts) {
    throw badRequest('Too many OTP attempts. Please request a new code.', 'OTP_RATE_LIMITED');
  }

  const isMatch = await otpRequest.compareCode(otp);
  if (!isMatch) {
    otpRequest.attempts += 1;
    await otpRequest.save();
    throw unauthorized('Invalid or expired OTP', 'INVALID_OTP');
  }

  const passwordHash = await User.hashPassword(password);
  const normalizedSignupCode = String(signupCode || referralCode || couponCode || '').trim().toUpperCase();
  const normalizedReferralCode = normalizedSignupCode;
  const referrer = normalizedReferralCode ? await User.findOne({ referralCode: normalizedReferralCode }) : null;
  if (normalizedSignupCode && !referrer) {
    await findAvailableCoupon(normalizedSignupCode, { _id: new mongoose.Types.ObjectId(), role: finalRole }, 'SIGNUP');
  }
  const user = await User.create({
    name,
    email: finalEmail,
    phone,
    passwordHash,
    role: finalRole,
    isBuddy: finalRole === 'BUDDY',
    referralCode: await createReferralCode(),
    referredBy: referrer?._id || null,
    signupCouponCode: referrer ? '' : normalizedSignupCode,
  });
  await ensureCustomerWallet(user._id);
  if (!referrer && normalizedSignupCode) {
    await redeemCoupon(normalizedSignupCode, user, 'SIGNUP');
  }
  otpRequest.consumedAt = new Date();
  await otpRequest.save();

  const accessToken = signToken(user._id);
  const refreshToken = signToken(user._id, env.refreshTokenSecret, env.refreshTokenExpiresIn);

  const refreshTokenHash = hashTokenValue(refreshToken);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  return { user, accessToken, refreshToken };
}

export async function requestLoginOtp(email) {
  const finalEmail = normalizeEmail(email);
  const user = await User.findOne({ email: finalEmail });
  if (!user) {
    return { message: 'If the account exists, a security code has been sent to the email address.' };
  }

  const otpCode = generateOtpCode();
  const otpHash = await OtpRequest.hashCode(otpCode);
  const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

  await OtpRequest.findOneAndUpdate(
    { email: finalEmail, purpose: 'LOGIN' },
    {
      email: finalEmail,
      purpose: 'LOGIN',
      codeHash: otpHash,
      expiresAt,
      attempts: 0,
      consumedAt: null,
    },
    { upsert: true, new: true }
  );

  await sendOtpEmail(finalEmail, otpCode, { name: user.name, purpose: 'login' });

  return {
    message: 'A security code has been sent to your email. Please verify it to continue.',
    expiresInMinutes: env.otpExpiryMinutes,
  };
}

export async function loginUser(email, password, otp = null) {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) throw unauthorized('Incorrect email or password');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw unauthorized('Incorrect email or password');

  if (!user.isActive) throw unauthorized('Account suspended');

  const shouldRequireOtp = isLoginOtpRequired({
    requiresOtpReauth: !!user.requiresOtpReauth,
    lastSeenAt: user.lastSeenAt,
  });

  if (shouldRequireOtp) {
    if (!otp) {
      await requestLoginOtp(normalizedEmail);
      throw unauthorized('Additional verification required. Please enter the login code sent to your email.', 'OTP_REQUIRED');
    }

    const otpRequest = await OtpRequest.findOne({ email: normalizedEmail, purpose: 'LOGIN' }).select('+codeHash');
    if (!otpRequest) {
      await requestLoginOtp(normalizedEmail);
      throw unauthorized('Additional verification required. Please request a login code.', 'OTP_REQUIRED');
    }

    if (new Date(otpRequest.expiresAt).getTime() < Date.now()) {
      throw unauthorized('Login verification expired. Please request a new code.', 'OTP_EXPIRED');
    }

    const isOtpMatch = await otpRequest.compareCode(otp);
    if (!isOtpMatch) {
      otpRequest.attempts += 1;
      await otpRequest.save();
      throw unauthorized('Invalid login verification code', 'INVALID_OTP');
    }

    otpRequest.consumedAt = new Date();
    await otpRequest.save();
  }

  await ensureReferralCode(user);
  user.lastSeenAt = new Date();
  user.requiresOtpReauth = false;
  await user.save();

  const accessToken = signToken(user._id);
  const refreshToken = signToken(user._id, env.refreshTokenSecret, env.refreshTokenExpiresIn);
  const refreshTokenHash = hashTokenValue(refreshToken);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  return { user, accessToken, refreshToken };
}

export async function refreshUserSession(refreshTokenValue) {
  if (!refreshTokenValue) throw unauthorized('Refresh token required');

  let decoded;
  try {
    decoded = jwt.verify(refreshTokenValue, env.refreshTokenSecret);
  } catch {
    throw unauthorized('Invalid refresh token');
  }

  const tokenHash = hashTokenValue(refreshTokenValue);
  const storedToken = await RefreshToken.findOne({
    userId: decoded.userId,
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!storedToken) throw unauthorized('Refresh token revoked or expired');

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) throw unauthorized('User not found or suspended');

  user.lastSeenAt = new Date();
  user.requiresOtpReauth = false;
  await user.save();

  const accessToken = signToken(user._id);
  const nextRefreshToken = signToken(user._id, env.refreshTokenSecret, env.refreshTokenExpiresIn);
  const nextHash = hashTokenValue(nextRefreshToken);

  storedToken.tokenHash = nextHash;
  storedToken.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await storedToken.save();

  return { user, accessToken, refreshToken: nextRefreshToken };
}

export async function revokeRefreshToken(refreshTokenValue) {
  if (!refreshTokenValue) return;
  const tokenHash = hashTokenValue(refreshTokenValue);
  await RefreshToken.updateOne({ tokenHash }, { revokedAt: new Date() });
}

export async function logoutUser(userId, refreshTokenValue, accessTokenValue) {
  let resolvedUserId = userId;

  if (!resolvedUserId && refreshTokenValue) {
    try {
      const decoded = jwt.verify(refreshTokenValue, env.refreshTokenSecret);
      resolvedUserId = decoded.userId;
    } catch {
      resolvedUserId = null;
    }
  }

  if (!resolvedUserId && accessTokenValue) {
    try {
      const decoded = jwt.verify(accessTokenValue, env.jwtSecret);
      resolvedUserId = decoded.userId;
    } catch {
      resolvedUserId = null;
    }
  }

  if (resolvedUserId) {
    await User.updateOne(
      { _id: resolvedUserId },
      { requiresOtpReauth: true, lastSeenAt: null }
    );

    await RefreshToken.updateMany({ userId: resolvedUserId }, { revokedAt: new Date() });
  }

  if (refreshTokenValue) {
    await revokeRefreshToken(refreshTokenValue);
  }
}

export async function requestPasswordReset(email) {
  const finalEmail = normalizeEmail(email);
  const user = await User.findOne({ email: finalEmail });
  if (!user) {
    return { message: 'If the email exists, a reset code has been sent.' };
  }

  const otpCode = generateOtpCode();
  const otpHash = await OtpRequest.hashCode(otpCode);
  const expiresAt = new Date(Date.now() + env.resetTokenExpiryMinutes * 60 * 1000);

  await OtpRequest.findOneAndUpdate(
    { email: finalEmail, purpose: 'PASSWORD_RESET' },
    {
      email: finalEmail,
      purpose: 'PASSWORD_RESET',
      codeHash: otpHash,
      expiresAt,
      attempts: 0,
      consumedAt: null,
    },
    { upsert: true, new: true }
  );

  await sendPasswordResetEmail(finalEmail, otpCode, { name: user.name });

  return { message: 'If the email exists, a reset code has been sent.' };
}

export async function resetPasswordWithOtp(email, otp, newPassword) {
  const finalEmail = normalizeEmail(email);
  const otpRequest = await OtpRequest.findOne({ email: finalEmail, purpose: 'PASSWORD_RESET' }).select('+codeHash');
  if (!otpRequest) throw badRequest('Reset OTP not found', 'OTP_NOT_REQUESTED');
  if (new Date(otpRequest.expiresAt).getTime() < Date.now()) {
    throw badRequest('Reset OTP expired. Please request a new one.', 'OTP_EXPIRED');
  }

  const isMatch = await otpRequest.compareCode(otp);
  if (!isMatch) {
    otpRequest.attempts += 1;
    await otpRequest.save();
    throw unauthorized('Invalid reset OTP', 'INVALID_OTP');
  }

  const user = await User.findOne({ email: finalEmail });
  if (!user) throw badRequest('User not found', 'USER_NOT_FOUND');

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();
  otpRequest.consumedAt = new Date();
  await otpRequest.save();

  return { message: 'Password reset successful' };
}

export async function getUserById(userId) {
  return User.findById(userId);
}
