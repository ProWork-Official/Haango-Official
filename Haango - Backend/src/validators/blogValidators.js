import { body } from 'express-validator';

const blogFieldsValidator = [
  body('title').trim().isLength({ min: 1, max: 160 }).withMessage('Title is required and must be 160 characters or fewer'),
  body('subtitle').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
  body('slug').optional({ checkFalsy: true }).trim().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).isLength({ max: 180 }),
  body('metaTitle').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
  body('metaDescription').optional({ checkFalsy: true }).trim().isLength({ max: 320 }),
  body('introduction').optional({ checkFalsy: true }).trim().isLength({ max: 5000 }),
  body('body').trim().isLength({ min: 1, max: 50000 }).withMessage('Blog text is required and must be 50,000 characters or fewer'),
  body('contentBlocks').optional().isArray({ max: 100 }),
  body('image')
    .isString()
    .isLength({ min: 1, max: 2_000_000 })
    .matches(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/)
    .withMessage('A valid compressed image is required'),
];

export const createBlogValidator = blogFieldsValidator;
export const updateBlogValidator = blogFieldsValidator;
