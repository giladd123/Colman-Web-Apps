import { Router } from 'express';
import { getPlayerData, getPlayerPage, savePlayerProgress, getNextEpisodeToPlay } from '../controllers/playerController.js';
import catchAsync from '../controllers/utils.js';

const router = Router();

// This route serves the HTML shell
router.get('/:contentId', catchAsync(getPlayerPage));

// This API route gets the video data (URL, watch time)
router.get('/api/data/:contentId/:profileName', catchAsync(getPlayerData));

// This API route saves the watch progress
router.post('/api/progress', catchAsync(savePlayerProgress));

router.get('/api/next-episode/:showId/:profileName', catchAsync(getNextEpisodeToPlay));


export default router;