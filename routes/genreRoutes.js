import express from "express";
import {
  getAllGenres,
  getContentByGenre,
  renderGenrePage
} from "../controllers/genreController.js";

const router = express.Router();

// API routes
router.get("/api/genres", getAllGenres);
router.get("/api/genres/:genre", getContentByGenre);

// Page rendering route
router.get("/:genre", renderGenrePage);

export default router;