import express from "express";
import {
  getAllGenres,
  getContentByGenre,
  renderGenrePage,
} from "../controllers/genreController.js";
import { requireProfile } from "../middleware/authMiddleware.js";

const router = express.Router();

// API routes
router.get("/api/genres", requireProfile, getAllGenres);
router.get("/api/genres/:genre", requireProfile, getContentByGenre);

// Page rendering route
router.get("/:genre", requireProfile, renderGenrePage);

export default router;
