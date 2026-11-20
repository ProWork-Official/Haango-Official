import AdminEmailList from '../models/AdminEmailList.js';
import AdminEmailListAudit from '../models/AdminEmailListAudit.js';
import { badRequest, notFound } from '../utils/errors.js';
import {
  MAX_BULK_EMAIL_RECIPIENTS,
  parseBulkEmailRecipientDetails,
} from '../utils/emailRecipientList.js';

const MAX_LIST_NAME_LENGTH = 40;

function parseListName(input, fallback) {
  if (input === undefined) return fallback;
  const name = String(input || '').trim();
  if (!name) throw badRequest('Enter a name for this email list.');
  if (name.length > MAX_LIST_NAME_LENGTH) {
    throw badRequest(`Email list names must be ${MAX_LIST_NAME_LENGTH} characters or fewer.`);
  }
  return name;
}

function parseListEmails(input) {
  let parsed;
  try {
    parsed = parseBulkEmailRecipientDetails(input);
  } catch {
    throw badRequest('Enter email addresses separated by commas or new lines.');
  }
  if (parsed.emails.length > MAX_BULK_EMAIL_RECIPIENTS) {
    throw badRequest(`A list can contain no more than ${MAX_BULK_EMAIL_RECIPIENTS} accepted Gmail addresses.`);
  }
  return parsed;
}

export async function getLists() {
  return AdminEmailList.find({ isDeleted: { $ne: true } }).sort({ listNumber: 1 }).lean();
}

export async function createList(emails, requestedName) {
  const parsed = parseListEmails(emails);
  if (!parsed.emails.length) throw badRequest('Add at least one valid Gmail address.');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const latest = await AdminEmailList.findOne({}).sort({ listNumber: -1 }).select('listNumber').lean();
    const listNumber = (latest?.listNumber || 0) + 1;
    try {
      const list = await AdminEmailList.create({
        listNumber,
        name: parseListName(String(requestedName || '').trim() ? requestedName : undefined, `List ${listNumber}`),
        emails: parsed.emails,
      });
      return { list, skipped: parsed.skipped };
    } catch (error) {
      if (error?.code !== 11000 || attempt === 2) throw error;
    }
  }
  throw badRequest('Unable to allocate a new email list number.');
}

export async function updateList(id, emails, requestedName) {
  const list = await AdminEmailList.findById(id);
  if (!list || list.isDeleted) throw notFound('Email list not found.');
  const parsed = parseListEmails(emails);
  if (requestedName !== undefined) list.name = parseListName(requestedName, list.name);
  list.emails = parsed.emails;
  await list.save();
  return { list, skipped: parsed.skipped };
}

export async function deleteList(id) {
  const list = await AdminEmailList.findById(id);
  if (!list || list.isDeleted) throw notFound('Email list not found.');
  list.isDeleted = true;
  await list.save();
  return { deleted: true, listNumber: list.listNumber };
}

export async function getSignupAudit(page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const [entries, total] = await Promise.all([
    AdminEmailListAudit.find({})
      .sort({ signedInAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AdminEmailListAudit.countDocuments({}),
  ]);
  return {
    entries: entries.map((entry) => ({
      ...entry,
      message: `List ${entry.listNumber} - ${entry.email} - signed in`,
    })),
    total,
  };
}

export async function removeSignedUpAddress(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase().replace(/@googlemail\.com$/, '@gmail.com');
  if (!normalizedEmail) return [];
  const matchingLists = await AdminEmailList.find({ emails: normalizedEmail, isDeleted: { $ne: true } })
    .select('listNumber')
    .lean();
  if (!matchingLists.length) return [];

  const signedInAt = new Date();
  await AdminEmailListAudit.insertMany(matchingLists.map((list) => ({
    listNumber: list.listNumber,
    email: normalizedEmail,
    event: 'SIGNED_UP',
    signedInAt,
  })));
  const removed = [];
  for (const list of matchingLists) {
    const result = await AdminEmailList.updateOne(
      { _id: list._id, emails: normalizedEmail },
      { $pull: { emails: normalizedEmail } },
    );
    if (result.modifiedCount > 0) {
      removed.push(list.listNumber);
    }
  }
  return removed;
}
