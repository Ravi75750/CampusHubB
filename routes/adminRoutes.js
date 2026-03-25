import { Router } from 'express';
const router = Router();
import { getNotices, createNotice, deleteNotice, getPendingTeachers, approveTeacher, getAllUsers, createStudent, deleteUser, updateUser, getReports, getArchivedPosts, restorePost, updateSiteSettings } from '../controllers/adminController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

// Public route for notices
router.get('/notices', getNotices);

// Apply admin protection to all routes
router.use(verifyToken, isAdmin);

router.get('/pending-teachers', getPendingTeachers);
router.patch('/approve-teacher/:id', approveTeacher);
router.get('/users', getAllUsers);
router.post('/create-student', createStudent);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id', updateUser);

router.get('/reports', getReports);

router.get('/archived-posts', getArchivedPosts);
router.patch('/restore-post/:id', restorePost);

router.post('/notices', createNotice);
router.delete('/notices/:id', deleteNotice);

// Settings
router.put('/settings', upload.single('landingPageImage'), updateSiteSettings);

export default router;
