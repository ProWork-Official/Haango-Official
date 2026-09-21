import { env } from '../config/environment.js';
import * as pushSubscriptionService from '../services/pushSubscriptionService.js';
import { success } from '../utils/response.js';

export function getPublicKey(_req, res) {
  res.json(success({ publicKey: env.vapidPublicKey || null }));
}

export async function subscribe(req, res, next) {
  try {
    const subscription = await pushSubscriptionService.savePushSubscription(req.user._id, req.body);
    res.status(201).json(success(subscription));
  } catch (err) {
    next(err);
  }
}

export async function unsubscribe(req, res, next) {
  try {
    await pushSubscriptionService.removePushSubscription(req.user._id, req.body?.endpoint);
    res.json(success({ removed: true }));
  } catch (err) {
    next(err);
  }
}