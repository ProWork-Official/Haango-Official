import * as contactSubmissionService from '../services/contactSubmissionService.js';
import { success } from '../utils/response.js';

export async function createContactSubmission(req, res, next) {
  try {
    const submission = await contactSubmissionService.createContactSubmission(
      req.body,
      req.user || null,
      req.ip
    );
    res.status(201).json(success({
      id: String(submission._id),
      createdAt: submission.createdAt,
    }));
  } catch (err) {
    next(err);
  }
}

export async function adminListContactSubmissions(req, res, next) {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 20;
    res.json(success(await contactSubmissionService.listContactSubmissions(page, limit)));
  } catch (err) {
    next(err);
  }
}
