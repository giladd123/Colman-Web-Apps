import { Router } from "express";
import {
  getPlayerData,
  getPlayerPage,
  savePlayerProgress,
  getNextEpisodeToPlay,
} from "../controllers/playerController.js";
import catchAsync from "../controllers/utils.js";
import { requireProfile } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/:contentId", requireProfile, catchAsync(getPlayerPage));
router.get("/api/data/:contentId/:profileId",requireProfile, catchAsync(getPlayerData));
router.post("/api/progress",requireProfile, catchAsync(savePlayerProgress));
router.get(
  "/api/next-episode/:showId/:profileId",
  requireProfile,
  catchAsync(getNextEpisodeToPlay)
);

export default router;
