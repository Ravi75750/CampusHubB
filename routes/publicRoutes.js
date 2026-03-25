import { Router } from 'express';
import { getSiteSettings } from '../controllers/publicController.js';

const router = Router();

router.get('/settings', getSiteSettings);

export default router;
