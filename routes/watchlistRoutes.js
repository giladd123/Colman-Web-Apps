import { Router } from "express";
import {
  addToWatchlist,
  removeFromWatchlist,
} from "../controllers/watchlistController.js";
import { requireProfile } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/:profileName/:contentId", requireProfile, addToWatchlist);
router.delete("/:profileName/:contentId", requireProfile, removeFromWatchlist);

export default router;
