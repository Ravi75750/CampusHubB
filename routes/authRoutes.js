import { Router } from 'express';
const router = Router();
import { registerStep1, registerStep2, loginStep1, loginStep2, getUserById, updateUser, getMe, searchUsers, checkUsername } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

import upload from '../middleware/uploadMiddleware.js';

router.get('/check-username/:username', checkUsername);
router.post('/register-step-1', registerStep1);
router.post('/register-step-2', upload.single('avatar'), registerStep2);
router.post('/login-step-1', loginStep1);
router.post('/login-step-2', loginStep2);

router.get('/user/:id', verifyToken, getUserById);
router.put('/user', (req, res, next) => {
    console.log('PUT /user route hit');
    next();
}, verifyToken, upload.single('avatar'), updateUser);
router.get('/me', verifyToken, getMe);
router.get('/search', verifyToken, searchUsers);

export default router;
