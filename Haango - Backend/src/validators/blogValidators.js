import { body } from 'express-validator';

const blogFieldsValidator = [
  body('title').trim().isLength({ min: 1, max: 160 }).withMessage('Title is required and must be 160 characters or fewer'),
  body('body').trim().isLength({ min: 1, max: 50000 }).withMessage('Blog text is required and must be 50,000 characters or fewer'),
  body('image')
    .isString()
    .isLength({ min: 1, max: 2_000_000 })
    .matches(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/)
    .withMessage('A valid compressed image is required'),
];

export const createBlogValidator = blogFieldsValidator;
export const updateBlogValidator = blogFieldsValidator;
