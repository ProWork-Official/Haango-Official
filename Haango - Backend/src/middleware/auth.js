import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/environment.js';
import { unauthorized, forbidden } from '../utils/errors.js';

export async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.[env.accessCookieName];
    const headerToken = req.headers['x-access-token'];
    const queryToken = req.query?.access_token;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : (headerToken || cookieToken || queryToken);

    if (!token) {
      throw unauthorized('Authentication required');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch {
      throw unauthorized('Invalid or expired token');
    }

    const user = await User.findById(decoded.userId);
    if (!user) throw unauthorized('User not found');
    if (!user.isActive) throw forbidden('Account suspended');

    user.lastSeenAt = new Date();
    user.requiresOtpReauth = false;
    await user.save();

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized('Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(forbidden(`This action requires ${roles.join(' or ')} role`));
    }
    next();
  };
}

export function requireAdminLevel(minLevel) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized('Authentication required'));
    if (!['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(req.user.role)) {
      return next(forbidden('Admin access required'));
    }
    if ((req.user.adminLevel || 0) < minLevel) {
      return next(forbidden(`This action requires admin level ${minLevel}+`));
    }
    next();
  };
}

export const requireCustomer = requireRole('CUSTOMER');
export const requireBookingUser = requireRole('CUSTOMER', 'BUDDY');
export const requireBuddy = requireRole('BUDDY');
export const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN');
export const requireAdminLevel1 = requireAdminLevel(1);
export const requireAdminLevel2 = requireAdminLevel(2);
export const requireAdminLevel3 = requireAdminLevel(3);
export const requireCustomerOrAdmin = requireRole('CUSTOMER', 'ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN');
export const requireBuddyOrAdmin = requireRole('BUDDY', 'ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN');
