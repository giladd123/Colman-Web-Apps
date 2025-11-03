import express from 'express';
const router = express.Router();
import userController from '../controllers/userController.js';
import asyncHandler from '../controllers/utils.js';

router.get('/:userId', asyncHandler(userController.getUserById));
router.post('/login', asyncHandler(userController.loginUser));
router.post('/create', asyncHandler(userController.createUser));

router.delete('/:userId', asyncHandler(userController.deleteUser));

router.put('/:userId', asyncHandler(userController.updateUser));

export default router;