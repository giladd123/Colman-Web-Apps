import express from "express";
import multer from "multer";
import { showAddForm, addContent } from "../controllers/contentController.js";
import { fetchIMDB } from "../controllers/imdbController.js";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Routes
router.get("/add-content", showAddForm);
router.post("/add-content", upload.single("videoFile"), addContent);
router.get("/fetch-imdb", fetchIMDB);

export default router;
