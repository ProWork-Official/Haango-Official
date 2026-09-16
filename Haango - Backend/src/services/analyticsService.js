import PageVisit from '../models/PageVisit.js';
import { notFound } from '../utils/errors.js';

export async function trackPageVisit(userId, visitorId, page, timeSpent, referrer, userAgent, ipAddress) {
  try {
    await PageVisit.create({
      userId,
      visitorId,
      page,
      timeSpent,
      referrer,
      userAgent,
      ipAddress,
    });
  } catch (err) {
    console.error('Error tracking page visit:', err);
  }
}

export async function getDailyTraffic(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const data = await PageVisit.aggregate([
    {
      $match: {
        timestamp: { $gte: startOfDay, $lte: endOfDay },
      },
    },
    {
      $group: {
        _id: null,
        totalVisits: { $sum: 1 },
        uniqueUsers: { $addToSet: '$visitorId' },
        totalTimeSpent: { $sum: '$timeSpent' },
        avgTimePerVisit: { $avg: '$timeSpent' },
      },
    },
    {
      $project: {
        _id: 0,
        totalVisits: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        totalTimeSpent: 1,
        avgTimePerVisit: { $round: ['$avgTimePerVisit', 2] },
      },
    },
  ]);

  return data.length > 0
    ? data[0]
    : {
        totalVisits: 0,
        uniqueUsers: 0,
        totalTimeSpent: 0,
        avgTimePerVisit: 0,
      };
}

export async function getPopularPages(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const data = await PageVisit.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$page',
        visits: { $sum: 1 },
        avgTimeSpent: { $avg: '$timeSpent' },
        uniqueUsers: { $addToSet: '$visitorId' },
      },
    },
    {
      $project: {
        page: '$_id',
        _id: 0,
        visits: 1,
        avgTimeSpent: { $round: ['$avgTimeSpent', 2] },
        uniqueUsers: { $size: '$uniqueUsers' },
      },
    },
    { $sort: { visits: -1 } },
    { $limit: 10 },
  ]);

  return data;
}

export async function getUserAnalytics(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const data = await PageVisit.aggregate([
    {
      $match: {
        userId: userId,
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        totalVisits: { $sum: 1 },
        totalTimeSpent: { $sum: '$timeSpent' },
        pagesVisited: { $addToSet: '$page' },
      },
    },
    {
      $project: {
        _id: 0,
        totalVisits: 1,
        totalTimeSpent: 1,
        uniquePages: { $size: '$pagesVisited' },
      },
    },
  ]);

  return data.length > 0
    ? data[0]
    : {
        totalVisits: 0,
        totalTimeSpent: 0,
        uniquePages: 0,
      };
}

export async function getTrafficTrend(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const data = await PageVisit.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
        },
        visits: { $sum: 1 },
        uniqueUsers: { $addToSet: '$visitorId' },
        avgTimeSpent: { $avg: '$timeSpent' },
      },
    },
    {
      $project: {
        date: '$_id',
        _id: 0,
        visits: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        avgTimeSpent: { $round: ['$avgTimeSpent', 2] },
      },
    },
    { $sort: { date: 1 } },
  ]);

  return data;
}
