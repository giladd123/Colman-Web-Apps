import express from "express";
const router = express.Router();
import userController from "../controllers/userController.js";
import catchAsync from "../controllers/utils.js";
import {
  validateCreateUser,
  validateLoginUser,
} from "../middleware/validateUser.js";
import { requireAuth } from "../middleware/authMiddleware.js";

// Public routes (no authentication required)
router.post("/login", validateLoginUser, catchAsync(userController.loginUser));
router.post("/create", validateCreateUser, catchAsync(userController.createUser));
router.get("/session", catchAsync(userController.getSession)); // Check session state

// Protected routes (authentication required)
router.post("/logout", requireAuth, catchAsync(userController.logoutUser));
router.post("/select-profile", requireAuth, catchAsync(userController.selectProfile));
router.get("/:userId", requireAuth, catchAsync(userController.getUserById));
router.delete("/:userId", requireAuth, catchAsync(userController.deleteUser));
router.put("/:userId", requireAuth, catchAsync(userController.updateUser));

export default router;
