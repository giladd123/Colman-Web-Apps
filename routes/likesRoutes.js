import { Router } from "express";
import { addLikeByProfileName, removeLikeByProfileName } from "../controllers/likesController.js";

const router = Router();

// POST /api/likes/:profileName/:contentId  -> add like
router.post("/:profileName/:contentId", addLikeByProfileName);

// DELETE /api/likes/:profileName/:contentId -> remove like
router.delete("/:profileName/:contentId", removeLikeByProfileName);

export default router;
