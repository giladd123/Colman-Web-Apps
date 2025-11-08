// In Colman-Web-Apps/routes/mainRoutes.js

import express from 'express';
// Import BOTH controller functions
import { getContentById, getContentDataById } from '../controllers/contentController.js';

const router = express.Router();

// This route serves the HTML shell page
router.get('/:id', getContentById);

// This NEW route serves the JSON data
router.get('/api/data/:id', getContentDataById);

export default router;