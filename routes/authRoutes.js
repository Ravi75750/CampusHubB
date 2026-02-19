import { Router } from 'express';
const router = Router();
import { register, login, getUserById, updateUser, getMe, searchUsers } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

import upload from '../middleware/uploadMiddleware.js';

router.post('/register', upload.single('avatar'), register);
router.post('/login', login);
router.get('/user/:id', verifyToken, getUserById);
router.put('/user', (req, res, next) => {
    console.log('PUT /user route hit');
    next();
}, verifyToken, upload.single('avatar'), updateUser);
router.get('/me', verifyToken, getMe);
router.get('/search', verifyToken, searchUsers);

export default router;
