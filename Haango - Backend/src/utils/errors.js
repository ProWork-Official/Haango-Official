export class AppError extends Error {
  constructor(message, statusCode = 400, errorCode = 'UNKNOWN_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFound(message = 'Resource not found') {
  return new AppError(message, 404, 'NOT_FOUND');
}

export function forbidden(message = 'You do not have permission to perform this action') {
  return new AppError(message, 403, 'FORBIDDEN');
}

export function unauthorized(message = 'Authentication required') {
  return new AppError(message, 401, 'UNAUTHORIZED');
}

export function badRequest(message = 'Invalid request', errorCode = 'BAD_REQUEST') {
  return new AppError(message, 400, errorCode);
}

export function conflict(message = 'Conflict', errorCode = 'CONFLICT') {
  return new AppError(message, 409, errorCode);
}
