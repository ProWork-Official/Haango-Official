import AdminEmailCampaignHistory from '../models/AdminEmailCampaignHistory.js';
import { badRequest } from '../utils/errors.js';

const validDateFilters = new Set(['TODAY', 'YESTERDAY', 'ALL']);

function localDayBounds(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  if (date === 'YESTERDAY') start.setDate(start.getDate() - 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function parseDateBounds(date, from, to) {
  if (!validDateFilters.has(date)) throw badRequest('Choose Today, Yesterday, or All.');
  if (date === 'ALL') {
    if (from !== undefined || to !== undefined) throw badRequest('Date bounds are not valid for All.');
    return null;
  }

  if (from === undefined && to === undefined) return localDayBounds(date);
  const start = new Date(from);
  const end = new Date(to);
  if (!from || !to || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw badRequest('Provide valid start and end timestamps for the selected date filter.');
  }
  return { start, end };
}

export async function createSavedListCampaignHistory({
  list,
  template,
  senderEmail,
  attemptedAt = new Date(),
  totalRecipients,
  attemptedRecipients,
  skipped,
}) {
  return AdminEmailCampaignHistory.create({
    listId: list._id,
    listNumber: list.listNumber,
    listName: list.name,
    templateId: template.id,
    templateTitle: template.title,
    senderEmail,
    attemptedAt,
    status: 'PENDING',
    totalRecipients,
    attemptedRecipients,
    skipped,
  });
}

export async function completeSavedListCampaignHistory(historyId, { sent, failed, status }) {
  const finalStatus = status || (failed > 0
    ? (sent > 0 ? 'PARTIAL' : 'FAILED')
    : (sent > 0 ? 'SENT' : 'SKIPPED'));
  await AdminEmailCampaignHistory.updateOne(
    { _id: historyId },
    { $set: { sent, failed, status: finalStatus } },
  );
}

export async function getCampaignHistory({ page = 1, limit = 50, date = 'ALL', from, to } = {}) {
  const bounds = parseDateBounds(String(date).toUpperCase(), from, to);
  const filter = bounds ? { attemptedAt: { $gte: bounds.start, $lt: bounds.end } } : {};
  const skip = (page - 1) * limit;
  const [entries, total] = await Promise.all([
    AdminEmailCampaignHistory.find(filter)
      .sort({ attemptedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AdminEmailCampaignHistory.countDocuments(filter),
  ]);
  return { entries, total };
}
