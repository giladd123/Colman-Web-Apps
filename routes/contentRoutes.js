import express from "express";
import multer from "multer";
import {
  showAddForm,
  addContent,
  showEditForm,
  updateContent,
} from "../controllers/contentController.js";
import { fetchIMDB } from "../controllers/imdbController.js";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Routes
router.get("/add-content", showAddForm);
router.post("/add-content", upload.single("videoFile"), addContent);
router.get("/edit/:id", showEditForm);
router.post("/edit/:id", upload.single("videoFile"), updateContent);
router.get("/fetch-imdb", fetchIMDB);

export default router;
