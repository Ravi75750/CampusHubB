import express from 'express';
const router = express.Router();
import * as eventController from '../controllers/eventController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

router.get('/', eventController.getEvents);
router.post('/', verifyToken, isAdmin, eventController.createEvent);
router.delete('/:id', verifyToken, isAdmin, eventController.deleteEvent);

export default router;
