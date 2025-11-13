import { Router } from "express";
import ProfilesController from "../controllers/profilesController.js";
import catchAsync from "../controllers/utils.js";
import multer from "multer";
import {
  validateCreateProfile,
  validateUpdateProfile,
} from "../middleware/validateProfile.js";
import loadProfile from "../middleware/loadProfile.js";
import { requireAuth, requireProfile } from "../middleware/authMiddleware.js";

const router = Router();

// Use memory storage so uploaded file.buffer is available to helpers
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get(
  "/default-avatars",
  catchAsync(ProfilesController.getDefaultAvatars)
);

router.get("/user/:userId", requireAuth, catchAsync(ProfilesController.getProfilesByUserId));

// Accept multipart form with field name 'avatar' for file uploads
router.post(
  "/create",
  upload.single("avatar"),
  requireAuth,
  validateCreateProfile,
  catchAsync(ProfilesController.createProfileRequest)
);

router.delete(
  "/:profileId",
  requireProfile,
  loadProfile, 
  catchAsync(ProfilesController.deleteProfile)
);

router.put(
  "/:profileId",
  upload.single("avatar"),
  loadProfile,
  requireProfile,
  validateUpdateProfile,
  catchAsync(ProfilesController.updateProfile)
);

export default router;
