import { Router } from 'express';
import { getPlayerData, getPlayerPage, savePlayerProgress, getNextEpisodeToPlay } from '../controllers/playerController.js';
import catchAsync from '../controllers/utils.js';

const router = Router();

router.get('/:contentId', catchAsync(getPlayerPage));
router.get('/api/data/:contentId/:profileName', catchAsync(getPlayerData));
router.post('/api/progress', catchAsync(savePlayerProgress));
router.get('/api/next-episode/:showId/:profileName', catchAsync(getNextEpisodeToPlay));

export default router;