import * as reportService from '../services/reportService.js';
import { success, paginated, buildPagination } from '../utils/response.js';

export async function createReport(req, res, next) {
  try {
    const report = await reportService.createReport(req.user._id, req.body);
    res.status(201).json(success(report));
  } catch (err) {
    next(err);
  }
}

export async function adminGetReports(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { reports, total } = await reportService.getAllReports(req.query.status, page, limit);
    res.json(paginated(reports, buildPagination(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateReport(req, res, next) {
  try {
    const report = await reportService.updateReportStatus(req.params.id, req.body);
    res.json(success(report));
  } catch (err) {
    next(err);
  }
}
