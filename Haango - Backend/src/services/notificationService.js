import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import webpush from 'web-push';
import { env } from '../config/environment.js';
import { notFound, forbidden } from '../utils/errors.js';
import { emitToUser } from '../utils/realtime.js';

const pushConfigured = Boolean(env.vapidSubject && env.vapidPublicKey && env.vapidPrivateKey);

if (pushConfigured) {
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
}

async function sendWebPush(userId, notification) {
  if (!pushConfigured) return;

  const subscriptions = await PushSubscription.find({ userId }).lean();
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.message,
    tag: String(notification._id),
    url: notification.metadata?.bookingId ? `/messages?bookingId=${notification.metadata.bookingId}` : '/',
  });

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime,
          keys: subscription.keys,
        },
        payload
      );
    } catch (error) {
      if ([404, 410].includes(error.statusCode)) {
        await PushSubscription.deleteOne({ _id: subscription._id });
      } else {
        console.error('Web push delivery failed:', error.message);
      }
    }
  }));
}

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
  if (!userId) return null;
  const notification = await Notification.create({ userId, type, title, message, metadata });
  emitToUser(userId, 'notification:new', notification.toObject());
  sendWebPush(userId, notification).catch((error) => {
    console.error('Web push preparation failed:', error.message);
  });
  return notification;
}
