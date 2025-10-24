import express from "express";
import { getFeed } from "../controllers/feedController.js";
const router = express.Router();

router.get("/:profileId", getFeed);

export default router;