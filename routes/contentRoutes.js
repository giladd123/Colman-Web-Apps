import express from "express";
import multer from "multer";
import { showAddForm, addContent } from "../controllers/contentController.js";
import { fetchIMDB } from "../controllers/imdbController.js";

const router = express.Router();

// Multer setup for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = file.originalname.split(".").pop();
    cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`);
  },
});

const upload = multer({ storage });

// Routes
router.get("/add-content", showAddForm);
// Handle optional video file or video URL
router.post("/add-content", upload.single("videoFile"), addContent);
router.get("/fetch-imdb", fetchIMDB);

export default router;
