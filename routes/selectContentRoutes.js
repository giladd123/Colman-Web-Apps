import express from "express";
import {
  getContentById,
  getContentDataById,
} from "../controllers/selectcontentController.js";
import catchAsync from "../controllers/utils.js";
import { requireProfile } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:id", requireProfile, catchAsync(getContentById));
router.get("/api/data/:id", requireProfile, catchAsync(getContentDataById));

export default router;
