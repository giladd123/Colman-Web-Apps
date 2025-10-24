import express from "express";
import { getRecommendations } from "../controllers/recommendationController.js";

const router = express.Router();

// GET /recommendations/:profileId
router.get("/:profileId", getRecommendations);

export default router;