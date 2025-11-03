import { Router } from 'express';
import ProfilesController from '../controllers/profilesController.js';
import asyncHandler from '../controllers/utils.js';
import multer from 'multer';

const router = Router();

// Use memory storage so uploaded file.buffer is available to helpers
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/user/:userId', asyncHandler(ProfilesController.getProfilesByUserId));

// Accept multipart form with field name 'avatar' for file uploads
router.post('/create', upload.single('avatar'), asyncHandler(ProfilesController.createProfileRequest));

router.delete('/:profileId', asyncHandler(ProfilesController.deleteProfile));

router.put('/:profileId', upload.single('avatar'), asyncHandler(ProfilesController.updateProfile));

export default router;