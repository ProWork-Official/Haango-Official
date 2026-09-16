import Report from '../models/Report.js';
import Booking from '../models/Booking.js';
import { notFound, forbidden } from '../utils/errors.js';

export async function createReport(reporterId, { reportedUserId, bookingId, reason, description }) {
  if (bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw notFound('Booking not found');

    const isParticipant =
      String(booking.customerId) === String(reporterId) ||
      String(booking.buddyId) === String(reporterId);

    if (!isParticipant) throw forbidden('Not part of this booking');
  }

  return Report.create({
    reporterId,
    reportedUserId,
    bookingId: bookingId || null,
    reason,
    description: description || '',
  });
}

export async function getAllReports(status, page = 1, limit = 20) {
  const query = {};
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const [reports, total] = await Promise.all([
    Report.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(query),
  ]);

  return { reports, total };
}

export async function updateReportStatus(reportId, { status, adminNotes }) {
  const report = await Report.findById(reportId);
  if (!report) throw notFound('Report not found');

  if (status) report.status = status;
  if (adminNotes !== undefined) report.adminNotes = adminNotes;
  await report.save();
  return report;
}
