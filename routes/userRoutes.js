import express from 'express';
const router = express.Router();
import userController from '../controllers/userController.js';

router.get('/:userId', userController.getUserById);
router.post('/login', userController.loginUser)
router.post('/create', userController.createUser);

router.delete('/:userId', userController.deleteUser);

router.put('/:userId', userController.updateUser);

export default router;