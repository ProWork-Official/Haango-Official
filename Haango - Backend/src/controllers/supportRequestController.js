import * as supportRequestService from '../services/supportRequestService.js';
import { success, paginated, buildPagination } from '../utils/response.js';

export async function adminGetSupportRequestStats(req, res, next) {
  try {
    const stats = await supportRequestService.getSupportRequestStats();
    res.json(success(stats));
  } catch (err) {
    next(err);
  }
}

export async function createSupportRequest(req, res, next) {
  try {
    const request = await supportRequestService.createSupportRequest(req.user._id, req.body || {});
    res.status(201).json(success(request));
  } catch (err) {
    next(err);
  }
}

export async function getMySupportRequests(req, res, next) {
  try {
    const requests = await supportRequestService.getUserSupportRequests(req.user._id);
    res.json(success(requests));
  } catch (err) {
    next(err);
  }
}

export async function adminGetSupportRequests(req, res, next) {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 20;
    const filters = {
      status: req.query.status,
      raisedToday: req.query.raisedToday === 'true',
      search: String(req.query.search || '').trim(),
    };
    const { requests, total } = await supportRequestService.getAllSupportRequests(filters, page, limit);
    res.json(paginated(requests, buildPagination(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

export async function adminResolveSupportRequest(req, res, next) {
  try {
    const request = await supportRequestService.adminResolveSupportRequest(req.params.id, req.user._id, req.body || {});
    res.json(success(request));
  } catch (err) {
    next(err);
  }
}
