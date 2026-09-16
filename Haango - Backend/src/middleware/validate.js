import { validationResult } from 'express-validator';
import { badRequest } from '../utils/errors.js';

export function handleValidationErrors(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => e.msg).join(', ');
    return next(badRequest(message, 'VALIDATION_ERROR'));
  }
  next();
}
