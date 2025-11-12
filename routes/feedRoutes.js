import express from "express";
import {
  getAllContent,
  getContentByGenre,
  getFeedForProfile,
} from "../controllers/feedController.js";

const router = express.Router();

router.get("/allContent", getAllContent);

router.get("/profile/:profileId", getFeedForProfile);
router.get("/genre/:genre", getContentByGenre);

export default router;
