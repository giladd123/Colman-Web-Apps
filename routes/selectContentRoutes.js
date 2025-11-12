import express from 'express';
import { getContentById, getContentDataById } from '../controllers/selectcontentController.js';
import catchAsync from '../controllers/utils.js'; 

const router = express.Router();

router.get('/:id', catchAsync(getContentById));
router.get('/api/data/:id', catchAsync(getContentDataById));

export default router;