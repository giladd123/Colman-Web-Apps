import express from 'express';
const router = express.Router();
import userController from '../controllers/userController.js';
import { loginLimiter, createUserLimiter, apiLimiter } from '../middleware/rateLimiter.js';

router.get('/:userId', apiLimiter, userController.getUserById);
router.post('/login', loginLimiter, userController.loginUser);
router.post('/create', createUserLimiter, userController.createUser);

router.delete('/:userId', apiLimiter, userController.deleteUser);

router.put('/:userId', apiLimiter, userController.updateUser);

export default router;