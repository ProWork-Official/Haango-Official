import { Router } from 'express';
import * as blogController from '../controllers/blogController.js';

const router = Router();

router.get('/', blogController.listBlogs);
router.get('/:id', blogController.getBlog);

export default router;
