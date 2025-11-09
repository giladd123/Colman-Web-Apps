import express from "express";
import {
  getAllContent,
  getContentByGenre,
  getFeedForProfile,
} from "../controllers/feedController.js";

const router = express.Router();

router.get("/allContent", getAllContent);

router.get("/:profileName", getFeedForProfile);
router.get("/genre/:genre", getContentByGenre);

export default router;
