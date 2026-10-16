import PageVisit from '../models/PageVisit.js';
import User from '../models/User.js';
import { notFound } from '../utils/errors.js';
import { classifyAcquisitionSource, normalizeReferrerOrigin } from '../utils/acquisitionSource.js';
import { lookupIpLocation } from './ipGeolocationService.js';

export function resolveVisitorDisplayName(userName, userRecord) {
  if (typeof userName === 'string' && userName.trim()) return userName.trim();
  if (userRecord && typeof userRecord.name === 'string' && userRecord.name.trim()) return userRecord.name.trim();
  if (userRecord && typeof userRecord.fullName === 'string' && userRecord.fullName.trim()) return userRecord.fullName.trim();
  return null;
}

function enrichVisitLocation(ipAddress, visitFilter) {
  void lookupIpLocation(ipAddress)
    .then((location) => location && PageVisit.updateOne(visitFilter, { $set: { location } }))
    .catch(() => {});
}

export async function trackPageVisit(userId, visitorId, page, timeSpent, referrer, userAgent, ipAddress, visitId, landingUrl, siteOrigin, pagesVisited = [], userName = null) {
  try {
    let resolvedUserName = resolveVisitorDisplayName(userName, null);
    if (!resolvedUserName && userId) {
      const userRecord = await User.findById(userId).select('name fullName').lean();
      resolvedUserName = resolveVisitorDisplayName(userName, userRecord);
    }

    const acquisition = classifyAcquisitionSource(referrer, landingUrl, siteOrigin);
    const safeReferrer = normalizeReferrerOrigin(referrer);
    const now = new Date();
    const normalizedPages = Array.isArray(pagesVisited) ? pagesVisited.slice(-30).map((item) => ({
      page: item?.page || page,
      timestamp: item?.timestamp ? new Date(item.timestamp) : now,
      timeSpent: Number(item?.timeSpent || 0),
    })) : [];

    if (!normalizedPages.some((item) => item.page === page)) {
      normalizedPages.push({ page, timestamp: now, timeSpent: Number(timeSpent) || 0 });
    }

    if (visitId) {
      if (userId) {
        await PageVisit.updateMany(
          { visitorId, userId: null, timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) } },
          { $set: { userId, userName: resolvedUserName || undefined } },
        );
      }

      const update = {
        $set: {
          page,
          referrer: safeReferrer,
          userAgent,
          ipAddress,
          lastSeenAt: now,
          pagesVisited: normalizedPages,
          userName: resolvedUserName || undefined,
        },
        $max: { timeSpent: Number(timeSpent) || 0 },
        $setOnInsert: {
          visitorId,
          timestamp: now,
          acquisitionSource: acquisition.acquisitionSource,
          acquisitionDetail: acquisition.acquisitionDetail,
        },
      };
      if (userId) update.$set.userId = userId;
      if (resolvedUserName) update.$set.userName = resolvedUserName;
      await PageVisit.findOneAndUpdate(
        { visitorId, visitId },
        update,
        { upsert: true, setDefaultsOnInsert: true, new: true },
      );
      enrichVisitLocation(ipAddress, { visitorId, visitId });
      return;
    }

    const visit = await PageVisit.create({
      userId,
      visitorId,
      page,
      userName: resolvedUserName || null,
      pagesVisited: normalizedPages,
      lastSeenAt: now,
      timeSpent,
      referrer: safeReferrer,
      acquisitionSource: acquisition.acquisitionSource,
      acquisitionDetail: acquisition.acquisitionDetail,
      userAgent,
      ipAddress,
    });
    enrichVisitLocation(ipAddress, { _id: visit._id });
  } catch (err) {
    console.error('Error tracking page visit:', err);
  }
}

const legacyAcquisitionSource = {
  $switch: {
    branches: [
      { case: { $regexMatch: { input: { $ifNull: ['$referrer', ''] }, regex: '(whatsapp\\.com|wa\\.me)', options: 'i' } }, then: 'WHATSAPP' },
      { case: { $regexMatch: { input: { $ifNull: ['$referrer', ''] }, regex: '(facebook\\.com|instagram\\.com|linkedin\\.com|tiktok\\.com|twitter\\.com|x\\.com|youtube\\.com)', options: 'i' } }, then: 'SOCIAL' },
      { case: { $regexMatch: { input: { $ifNull: ['$referrer', ''] }, regex: 'google\\.', options: 'i' } }, then: 'GOOGLE_SEARCH' },
      { case: { $eq: [{ $ifNull: ['$referrer', ''] }, ''] }, then: 'DIRECT' },
    ],
    default: 'EXTERNAL_REFERRAL',
  },
};

function getVisitDateMatch(days, dateRange) {
  const startDate = dateRange?.startDate || new Date();
  if (!dateRange?.startDate) startDate.setDate(startDate.getDate() - days);
  const timestamp = { $gte: startDate };
  if (dateRange?.endDate) timestamp.$lt = dateRange.endDate;
  return { timestamp };
}

export async function getPlatformActivity(days = 30, dateRange = null) {
  const match = getVisitDateMatch(days, dateRange);
  const withSource = [
    { $match: match },
    { $addFields: { resolvedAcquisitionSource: { $ifNull: ['$acquisitionSource', legacyAcquisitionSource] } } },
  ];

  const [summaryRows, sourceRows, pageRows, recentVisits] = await Promise.all([
    PageVisit.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: 1 },
          visitors: { $addToSet: '$visitorId' },
          signedInVisitors: { $addToSet: { $cond: [{ $ne: [{ $ifNull: ['$userId', null] }, null] }, '$visitorId', null] } },
          totalTimeSpent: { $sum: '$timeSpent' },
        },
      },
      { $project: { _id: 0, totalVisits: 1, uniqueVisitors: { $size: '$visitors' }, signedInVisitors: { $size: { $setDifference: ['$signedInVisitors', [null]] } }, totalTimeSpent: 1 } },
    ]),
    PageVisit.aggregate([
      ...withSource,
      {
        $group: {
          _id: '$resolvedAcquisitionSource',
          visits: { $sum: 1 },
          visitors: { $addToSet: '$visitorId' },
          signedInVisitors: { $addToSet: { $cond: [{ $ne: [{ $ifNull: ['$userId', null] }, null] }, '$visitorId', null] } },
          avgTimeSpent: { $avg: '$timeSpent' },
        },
      },
      {
        $project: {
          _id: 0,
          source: '$_id',
          visits: 1,
          uniqueVisitors: { $size: '$visitors' },
          signedInVisitors: { $size: { $setDifference: ['$signedInVisitors', [null]] } },
          avgTimeSpent: { $round: ['$avgTimeSpent', 2] },
        },
      },
      { $sort: { visits: -1, source: 1 } },
    ]),
    PageVisit.aggregate([
      { $match: match },
      { $group: { _id: '$page', visits: { $sum: 1 }, uniqueVisitors: { $addToSet: '$visitorId' }, avgTimeSpent: { $avg: '$timeSpent' } } },
      { $project: { _id: 0, page: '$_id', visits: 1, uniqueVisitors: { $size: '$uniqueVisitors' }, avgTimeSpent: { $round: ['$avgTimeSpent', 2] } } },
      { $sort: { visits: -1 } },
      { $limit: 10 },
    ]),
    PageVisit.find(match)
      .select('page timeSpent timestamp userId userName visitorId lastSeenAt pagesVisited referrer acquisitionSource acquisitionDetail location')
      .sort({ lastSeenAt: -1, timestamp: -1 })
      .limit(100)
      .lean(),
  ]);

  const totals = summaryRows[0] || { totalVisits: 0, uniqueVisitors: 0, signedInVisitors: 0, totalTimeSpent: 0 };
  const userIdsMissingNames = [...new Set(recentVisits.filter((visit) => visit.userId && !visit.userName).map((visit) => String(visit.userId)))];
  const userNameMap = new Map();

  if (userIdsMissingNames.length) {
    const users = await User.find({ _id: { $in: userIdsMissingNames } }, { name: 1, fullName: 1 }).lean();
    users.forEach((user) => {
      const resolvedName = resolveVisitorDisplayName(null, user);
      if (resolvedName) userNameMap.set(String(user._id), resolvedName);
    });
  }

  return {
    summary: {
      totalVisits: totals.totalVisits,
      uniqueVisitors: totals.uniqueVisitors,
      signedInVisitors: totals.signedInVisitors,
      guestVisitors: Math.max(0, totals.uniqueVisitors - totals.signedInVisitors),
      avgTimeSpent: totals.totalVisits ? Math.round(totals.totalTimeSpent / totals.totalVisits) : 0,
    },
    sources: sourceRows.map(({ source, ...row }) => ({
      source,
      ...row,
      guestVisitors: Math.max(0, row.uniqueVisitors - row.signedInVisitors),
    })),
    pages: pageRows,
    recentVisits: recentVisits.map((visit) => {
      const acquisition = visit.acquisitionSource
        ? { acquisitionSource: visit.acquisitionSource, acquisitionDetail: visit.acquisitionDetail || '' }
        : classifyAcquisitionSource(visit.referrer);
      const resolvedUserName = resolveVisitorDisplayName(visit.userName, { name: userNameMap.get(String(visit.userId)) || undefined, fullName: userNameMap.get(String(visit.userId)) || undefined });
      return {
        id: String(visit._id),
        page: visit.page,
        timeSpent: Number(visit.timeSpent || 0),
        timestamp: visit.timestamp,
        lastSeenAt: visit.lastSeenAt || visit.timestamp,
        pagesVisited: Array.isArray(visit.pagesVisited) ? visit.pagesVisited.slice(-10).map((pageEntry) => ({
          page: pageEntry?.page || visit.page,
          timestamp: pageEntry?.timestamp || visit.timestamp,
          timeSpent: Number(pageEntry?.timeSpent || 0),
        })) : [{ page: visit.page, timestamp: visit.timestamp, timeSpent: Number(visit.timeSpent || 0) }],
        visitorId: visit.visitorId,
        userName: resolvedUserName,
        displayName: resolvedUserName || (visit.userId ? 'Signed in user' : 'Guest visitor'),
        visitorType: visit.userId ? 'SIGNED_IN' : 'GUEST',
        source: acquisition.acquisitionSource,
        sourceDetail: acquisition.acquisitionDetail,
        location: [visit.location?.city, visit.location?.region, visit.location?.country].filter(Boolean).join(', '),
      };
    }),
  };
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

export async function getTrafficTrend(days = 7, dateRange = null, timezone = 'UTC') {
  const matches = getVisitDateMatch(days, dateRange);
  const isHourlyRange = Boolean(dateRange?.startDate && dateRange?.endDate && dateRange.endDate - dateRange.startDate <= 24 * 60 * 60 * 1000);

  const data = await PageVisit.aggregate([
    {
      $match: matches,
    },
    {
      $group: {
        _id: isHourlyRange
          ? { $dateToString: { format: '%Y-%m-%dT%H:00:00', date: '$timestamp', timezone } }
          : { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone } },
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
