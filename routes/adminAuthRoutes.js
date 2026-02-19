import { Router } from 'express';
const router = Router();
import { login, verifyOTP } from '../controllers/adminController.js';

router.post('/login', login);
router.post('/verify-otp', verifyOTP);

export default router;
