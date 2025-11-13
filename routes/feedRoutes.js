import express from "express";
import {
  getAllContent,
  getContentByGenre,
  getFeedForProfile,
} from "../controllers/feedController.js";
import { requireProfile } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/allContent", requireProfile, getAllContent);

router.get("/profile/:profileId", requireProfile, getFeedForProfile);
router.get("/genre/:genre", requireProfile, getContentByGenre);

export default router;
