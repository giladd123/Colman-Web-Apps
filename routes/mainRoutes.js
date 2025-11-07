import express from 'express';
import { getContentById } from '../controllers/contentController.js';

const router = express.Router();

router.get('/:id', getContentById);

export default router;