import { body } from 'express-validator';

export const createBookingValidator = [
  body('buddyId').isMongoId().withMessage('Valid buddy ID required'),
  body('activityId').isMongoId().withMessage('Valid activity ID required'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('startTime').notEmpty().withMessage('Start time required'),
  body('duration').isInt({ min: 1, max: 8 }).withMessage('Duration must be 1-8 hours'),
  body('meetingLocation').trim().isLength({ min: 2, max: 200 }).withMessage('Meeting location required'),
  body('customerNotes').optional().trim().isLength({ max: 1000 }),
  body('couponCode').optional().trim().isLength({ max: 50 }),
  body('useWallet').optional().isBoolean(),
];

export const createReviewValidator = [
  body('bookingId').isMongoId().withMessage('Valid booking ID required'),
  body('rating').isFloat({ min: 1, max: 5 }).custom((value) => {
    if (Math.round(Number(value) * 2) !== Number(value) * 2) throw new Error('Rating must use 0.5 steps');
    return true;
  }),
  body('comment').optional().trim().isLength({ max: 2000 }),
  body('images').optional().isArray({ max: 2 }).withMessage('A review can contain up to 2 images'),
  body('images.*').optional().isString().isLength({ max: 2_000_000 }),
];

export const updateReviewValidator = [
  body('rating').isFloat({ min: 1, max: 5 }).custom((value) => {
    if (Math.round(Number(value) * 2) !== Number(value) * 2) throw new Error('Rating must use 0.5 steps');
    return true;
  }),
  body('comment').optional().trim().isLength({ max: 2000 }),
  body('images').optional().isArray({ max: 2 }).withMessage('A review can contain up to 2 images'),
  body('images.*').optional().isString().isLength({ max: 2_000_000 }),
];

export const sendMessageValidator = [
  body('message').trim().isLength({ min: 1, max: 5000 }).withMessage('Message required (1-5000 chars)'),
];

export const createReportValidator = [
  body('reportedUserId').isMongoId().withMessage('Valid user ID required'),
  body('reason').trim().isLength({ min: 5, max: 200 }).withMessage('Reason required (5-200 chars)'),
  body('description').optional().trim().isLength({ max: 5000 }),
];

export const buddyProfileValidator = [
  body('displayName').optional().trim().isLength({ min: 2, max: 100 }),
  body('age').optional().isInt({ min: 18, max: 120 }).withMessage('Age must be between 18 and 120'),
  body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  body('about').optional().trim().isLength({ max: 2000 }),
  body('summary').optional().trim().isLength({ max: 300 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('hourlyRate').optional().isFloat({ min: 300, max: 400 }).withMessage('Hourly rate must be between 300 and 400'),
  body('languages').optional().isArray().withMessage('Languages must be an array'),
  body('hobbies').optional().isArray().withMessage('Hobbies must be an array'),
  body('availability').optional().isArray().withMessage('Availability must be an array'),
  body('availability.*.day').optional().trim().notEmpty(),
  body('availability.*.startTime').optional().trim().notEmpty(),
  body('availability.*.endTime').optional().trim().notEmpty(),
  body('responseTime').optional().trim().isLength({ max: 200 }),
  body('profileImages').optional().isArray().withMessage('Profile images must be an array'),
  body('profileImages.*').optional().isString().isLength({ max: 2_000_000 }),
  body('showOnFindCompanions').optional().isBoolean(),
  body('isAvailable').optional().isBoolean(),
  body('girlsOnly').optional().isBoolean(),
];

export const adminBuddyUpdateValidator = [
  ...buddyProfileValidator,
  body('profileImages').optional().isArray({ min: 3 }).withMessage('At least 3 profile photos are required'),
  body('profileImages.*').optional().isString().isLength({ min: 1, max: 2_000_000 }),
  body('languages.*').optional().isString().trim().isLength({ min: 1, max: 50 }),
  body('hobbies.*').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('availability.*.isAvailable').optional().isBoolean(),
  body('user').optional().isObject().withMessage('Account details must be an object'),
  body('user.name').optional().trim().isLength({ min: 2, max: 100 }),
  body('user.email').optional().isEmail().isLength({ max: 254 }),
  body('user.phone').optional().matches(/^\+?[\d\s-]{10,15}$/),
];
