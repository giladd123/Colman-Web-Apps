import express from "express";
import multer from "multer";
import {
  showAddForm,
  addContent,
  showEditLanding,
  showEditForm,
  showDeleteSuccess,
  updateContent,
  deleteContent,
  checkContentExists,
} from "../controllers/contentController.js";
import { fetchIMDB } from "../controllers/imdbController.js";
import { validateAdminUser } from "../middleware/validateAdmin.js";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Routes - apply admin validation selectively to avoid middleware order issues
router.get("/add-content", validateAdminUser, showAddForm);
router.get("/edit", validateAdminUser, showEditLanding);
router.post(
  "/add-content",
  upload.single("videoFile"),
  validateAdminUser,
  addContent
);
router.get("/edit/:id", validateAdminUser, showEditForm);
router.get("/delete-success", validateAdminUser, showDeleteSuccess);
router.post(
  "/edit/:id",
  upload.single("videoFile"),
  validateAdminUser,
  updateContent
);
router.delete("/delete/:id", validateAdminUser, deleteContent);
router.get("/fetch-imdb", validateAdminUser, fetchIMDB);
router.get("/check-content", validateAdminUser, checkContentExists);

export default router;
