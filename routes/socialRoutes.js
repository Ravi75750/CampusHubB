import { Router } from 'express';
const router = Router();
import { sendConnectionRequest, acceptConnectionRequest, getConnections, getPendingRequests, getConnectionStatus, removeConnection, blockUser, unblockUser, getConnectionCount, startConversation, getConversations, sendMessage, deleteMessage, editMessage, getMessages, acceptMessageRequest, getNotifications, markNotificationRead, deleteAllNotifications } from '../controllers/socialController.js';
import upload from '../middleware/uploadMiddleware.js';
import { verifyToken } from '../middleware/authMiddleware.js';

// Connections
router.post('/connect', verifyToken, sendConnectionRequest);
router.post('/connect/accept', verifyToken, acceptConnectionRequest);
router.get('/connections', verifyToken, getConnections);
router.get('/connections/pending', verifyToken, getPendingRequests);
router.get('/status/:userId', verifyToken, getConnectionStatus);
router.post('/connect/remove', verifyToken, removeConnection);
router.post('/block', verifyToken, blockUser);
router.post('/unblock', verifyToken, unblockUser);
router.get('/connections/count/:userId', verifyToken, getConnectionCount);

// Chat
router.post('/chat/start', verifyToken, startConversation);
router.get('/chat/conversations', verifyToken, getConversations); // ?type=requests|main
router.post('/chat/message', verifyToken, upload.single('image'), sendMessage);
router.delete('/chat/message/:id', verifyToken, deleteMessage);
router.put('/chat/message/:id', verifyToken, editMessage);
router.get('/chat/:conversationId/messages', verifyToken, getMessages);
router.post('/chat/accept', verifyToken, acceptMessageRequest);
// Notifications
router.get('/notifications', verifyToken, getNotifications);
router.put('/notifications/:id/read', verifyToken, markNotificationRead);
router.delete('/notifications', verifyToken, deleteAllNotifications);

export default router;
