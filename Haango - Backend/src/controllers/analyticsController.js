import * as analyticsService from '../services/analyticsService.js';
import { success } from '../utils/response.js';

export async function getDailyTraffic(req, res, next) {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    const traffic = await analyticsService.getDailyTraffic(new Date(date));
    res.json(success(traffic));
  } catch (err) {
    next(err);
  }
}

export async function getPopularPages(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 7;
    const pages = await analyticsService.getPopularPages(days);
    res.json(success(pages));
  } catch (err) {
    next(err);
  }
}

export async function getUserAnalytics(req, res, next) {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days) || 30;
    const analytics = await analyticsService.getUserAnalytics(userId, days);
    res.json(success(analytics));
  } catch (err) {
    next(err);
  }
}

export async function getTrafficTrend(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 7;
    const trend = await analyticsService.getTrafficTrend(days);
    res.json(success(trend));
  } catch (err) {
    next(err);
  }
}

export async function trackPageVisit(req, res, next) {
  try {
    const { page, timeSpent, referrer, visitorId } = req.body;
    if (!visitorId || !page) {
      return res.status(400).json({ success: false, message: 'visitorId and page are required' });
    }
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    await analyticsService.trackPageVisit(
      req.user?._id,
      visitorId,
      page,
      timeSpent || 0,
      referrer,
      userAgent,
      ipAddress
    );

    res.json(success({ tracked: true }));
  } catch (err) {
    next(err);
  }
}
