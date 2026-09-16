import Notification from '../models/Notification.js';
import { notFound, forbidden } from '../utils/errors.js';

export async function getUserNotifications(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments({ userId }),
  ]);

  return { notifications, total };
}

export async function markNotificationAsRead(notificationId, userId) {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw notFound('Notification not found');
  if (String(notification.userId) !== String(userId)) throw forbidden('Not your notification');

  notification.isRead = true;
  await notification.save();
  return notification;
}

export async function createNotification(userId, type, title, message, metadata = {}) {
  return Notification.create({ userId, type, title, message, metadata });
}
