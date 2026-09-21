import PushSubscription from '../models/PushSubscription.js';
import { badRequest } from '../utils/errors.js';

export async function savePushSubscription(userId, subscription) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw badRequest('Invalid browser push subscription', 'INVALID_PUSH_SUBSCRIPTION');
  }

  return PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      $set: {
        userId,
        expirationTime: subscription.expirationTime || null,
        keys: subscription.keys,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function removePushSubscription(userId, endpoint) {
  return PushSubscription.deleteOne({ userId, endpoint });
}