import { Router } from 'express';
const router = Router();
import { createPost, getPosts, getPostById, deletePost, editPost, addComment, likePost, getPostCountByUser, getPostsByUser, replyToComment } from '../controllers/postController.js';

import { verifyToken } from '../middleware/authMiddleware.js';
import moderationMiddleware from '../middleware/moderation.js';

import upload from '../middleware/uploadMiddleware.js';

// Apply auth to all interactions
router.post('/', verifyToken, upload.single('image'), moderationMiddleware, createPost);
router.get('/', verifyToken, getPosts); // Assuming only logged in users can see feed
router.get('/:id', verifyToken, getPostById);
router.delete('/:id', verifyToken, deletePost);
router.put('/:id', verifyToken, moderationMiddleware, editPost);
router.post('/:id/comment', verifyToken, moderationMiddleware, addComment);
router.put('/:id/like', verifyToken, likePost);
// Count
router.get('/count/:userId', verifyToken, getPostCountByUser);
// User Posts
router.get('/user/:userId', verifyToken, getPostsByUser);

router.post('/:id/comments/:commentId/reply', verifyToken, moderationMiddleware, replyToComment);

export default router;
