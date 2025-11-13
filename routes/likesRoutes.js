import { Router } from "express";
import { addLikeByProfileName, removeLikeByProfileName } from "../controllers/likesController.js";
import { requireProfile } from "../middleware/authMiddleware.js";

const router = Router();

// POST /api/likes/:profileName/:contentId  -> add like
router.post("/:profileName/:contentId", requireProfile, addLikeByProfileName);

// DELETE /api/likes/:profileName/:contentId -> remove like
router.delete("/:profileName/:contentId", requireProfile, removeLikeByProfileName);

export default router;
