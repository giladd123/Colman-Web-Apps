import { Router } from "express";
import { addToWatchlist, removeFromWatchlist } from "../controllers/watchlistController.js";

const router = Router();

router.post("/:profileName/:contentId", addToWatchlist);
router.delete("/:profileName/:contentId", removeFromWatchlist);

export default router;