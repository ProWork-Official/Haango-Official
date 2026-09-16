import {
  signupUser,
  loginUser,
  requestSignupOtp,
  requestLoginOtp,
  requestPasswordReset,
  resetPasswordWithOtp,
  refreshUserSession,
  logoutUser,
  issueAuthCookies,
} from '../services/authService.js';
import { success } from '../utils/response.js';
import { badRequest } from '../utils/errors.js';

export async function sendSignupOtp(req, res, next) {
  try {
    const { name, email, phone, password, role } = req.body;
    if (role === 'ADMIN') throw badRequest('Cannot self-register as admin', 'INVALID_ROLE');

    const result = await requestSignupOtp({ name, email, phone, password, role });
    res.json(success({ ...result }));
  } catch (err) {
    next(err);
  }
}

export async function signup(req, res, next) {
  try {
    const { name, email, phone, password, role, otp } = req.body;
    if (role === 'ADMIN') throw badRequest('Cannot self-register as admin', 'INVALID_ROLE');
    const { user, accessToken, refreshToken } = await signupUser({ name, email, phone, password, role, otp });
    issueAuthCookies(res, accessToken, refreshToken);
    res.status(201).json(success({ user: user.toSafeObject(), token: accessToken, refreshToken }));
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password, otp } = req.body;
    const { user, accessToken, refreshToken } = await loginUser(email, password, otp);
    issueAuthCookies(res, accessToken, refreshToken);
    res.json(success({ user: user.toSafeObject(), token: accessToken, refreshToken }));
  } catch (err) {
    next(err);
  }
}

export async function requestLoginCode(req, res, next) {
  try {
    const { email } = req.body;
    const result = await requestLoginOtp(email);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshTokenValue = req.cookies?.haango_refresh_token || req.headers['x-refresh-token'];
    const { user, accessToken, refreshToken } = await refreshUserSession(refreshTokenValue);
    issueAuthCookies(res, accessToken, refreshToken);
    res.json(success({ user: user.toSafeObject(), token: accessToken, refreshToken }));
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const accessTokenValue = req.cookies?.haango_access_token;
    const refreshTokenValue = req.cookies?.haango_refresh_token || req.headers['x-refresh-token'];
    const userId = req.user?._id || null;
    await logoutUser(userId, refreshTokenValue, accessTokenValue);
    res.clearCookie('haango_access_token');
    res.clearCookie('haango_refresh_token');
    res.json(success({ message: 'Logged out successfully' }));
  } catch (err) {
    next(err);
  }
}

export async function requestResetOtp(req, res, next) {
  try {
    const { email } = req.body;
    const result = await requestPasswordReset(email);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, otp, password } = req.body;
    const result = await resetPasswordWithOtp(email, otp, password);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    res.json(success({ user: req.user.toSafeObject() }));
  } catch (err) {
    next(err);
  }
}
