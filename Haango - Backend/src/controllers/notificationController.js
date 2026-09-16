import * as notificationService from '../services/notificationService.js';
import { success, paginated, buildPagination } from '../utils/response.js';

export async function getNotifications(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { notifications, total } = await notificationService.getUserNotifications(req.user._id, page, limit);
    res.json(paginated(notifications, buildPagination(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

export async function markNotificationAsRead(req, res, next) {
  try {
    const notification = await notificationService.markNotificationAsRead(req.params.id, req.user._id);
    res.json(success(notification));
  } catch (err) {
    next(err);
  }
}
