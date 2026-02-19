import express from 'express';
const router = express.Router();
import * as moderationController from '../controllers/moderationController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

router.post('/report', verifyToken, moderationController.reportContent);
router.post('/ban', verifyToken, moderationController.banUser);
router.post('/unban', verifyToken, moderationController.unbanUser);
router.get('/reports', verifyToken, moderationController.getReports);
router.put('/report/:id', verifyToken, moderationController.updateReportStatus);

export default router;
