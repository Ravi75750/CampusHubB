import ConnectionRequest from '../models/ConnectionRequest.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

/* -------------------- CONNECTIONS -------------------- */

// Send Connection Request
// Send Connection Request
export async function sendConnectionRequest(req, res) {
    try {
        const { receiverId } = req.body;
        if (receiverId === req.user.id) return res.status(400).json({ message: "Cannot connect to yourself" });

        let request = await ConnectionRequest.findOne({
            sender: req.user.id,
            receiver: receiverId
        });

        if (request) {
            if (request.status === 'accepted') {
                return res.status(400).json({ message: "Already connected" });
            }
            if (request.status === 'pending') {
                // Resend: update timestamp and send new notification
                request.updatedAt = Date.now();
                await request.save();

                // Send a fresh notification
                const notif = new Notification({
                    recipient: receiverId,
                    sender: req.user.id,
                    type: 'connection_request'
                });
                await notif.save();

                return res.status(200).json({ message: "Connection request resent" });
            }
            if (request.status === 'rejected') {
                // Reset to pending
                request.status = 'pending';
                await request.save();

                const notif = new Notification({
                    recipient: receiverId,
                    sender: req.user.id,
                    type: 'connection_request'
                });
                await notif.save();

                return res.status(200).json({ message: "Connection request sent again" });
            }
        }

        request = new ConnectionRequest({
            sender: req.user.id,
            receiver: receiverId
        });

        await request.save();

        // Notification
        const notif = new Notification({
            recipient: receiverId,
            sender: req.user.id,
            type: 'connection_request'
        });
        await notif.save();

        res.status(201).json({ message: "Connection request sent" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Accept Connection Request
export async function acceptConnectionRequest(req, res) {
    try {
        const { requestId } = req.body;
        const request = await ConnectionRequest.findById(requestId); // Correct usage

        if (!request) return res.status(404).json({ message: "Request not found" });
        if (request.receiver.toString() !== req.user.id) return res.status(401).json({ message: "Unauthorized" });

        request.status = 'accepted';
        await request.save();

        res.status(200).json({ message: "Connection accepted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Check Connection Status with a specific user
export async function getConnectionStatus(req, res) {
    try {
        const { userId } = req.params;
        if (userId === req.user.id) return res.json({ status: 'self' });

        const request = await ConnectionRequest.findOne({
            $or: [
                { sender: req.user.id, receiver: userId },
                { sender: userId, receiver: req.user.id }
            ]
        });

        if (!request) return res.json({ status: 'none' });

        if (request.status === 'accepted') return res.json({ status: 'accepted' });

        if (request.status === 'pending') {
            if (request.sender.toString() === req.user.id) return res.json({ status: 'pending', requestId: request._id });
            return res.json({ status: 'received', requestId: request._id });
        }

        // If rejected, treat as none so they can try again (which our send logic now handles)
        return res.json({ status: 'none' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Get My Connections (Accepted)
export async function getConnections(req, res) {
    try {
        const connections = await ConnectionRequest.find({
            $or: [{ sender: req.user.id }, { receiver: req.user.id }],
            status: 'accepted'
        }).populate('sender receiver', 'name avatar role');

        const friends = connections.map(c =>
            c.sender._id.toString() === req.user.id ? c.receiver : c.sender
        );

        res.status(200).json(friends);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Get Pending Requests (Received)
export async function getPendingRequests(req, res) {
    try {
        const requests = await ConnectionRequest.find({
            receiver: req.user.id,
            status: 'pending'
        }).populate('sender', 'name avatar role');
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

/* -------------------- CHAT -------------------- */

// Start Conversation (or get existing)
export async function startConversation(req, res) {
    try {
        const { receiverId } = req.body;

        // Check for existing conversation
        let conversation = await Conversation.findOne({
            participants: { $all: [req.user.id, receiverId] }
        });

        if (!conversation) {
            // Check connection status to determine if "pending" request needed
            const isConnected = await ConnectionRequest.exists({
                $or: [
                    { sender: req.user.id, receiver: receiverId, status: 'accepted' },
                    { sender: receiverId, receiver: req.user.id, status: 'accepted' }
                ]
            });

            const isTeacher = req.user.role === 'Teacher';
            conversation = new Conversation({
                participants: [req.user.id, receiverId],
                initiator: req.user.id,
                status: (isConnected || isTeacher) ? 'accepted' : 'pending'
            });
            await conversation.save();
        }

        res.status(200).json(conversation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Send Message
export async function sendMessage(req, res) {
    try {
        const { conversationId, text } = req.body;
        let image = req.body.image;
        if (req.file) image = req.file.path;

        if (!text && !image) return res.status(400).json({ message: "Text or image required" });

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Conversation not found" });

        // Create message
        const message = new Message({
            conversationId,
            sender: req.user.id,
            text,
            image
        });
        await message.save();

        // Update conversation
        conversation.lastMessage = text || 'Sent an image';
        conversation.lastMessageAt = Date.now();
        await conversation.save();

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function deleteMessage(req, res) {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: "Message not found" });

        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }

        await message.deleteOne();
        res.status(200).json({ message: "Message deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function editMessage(req, res) {
    try {
        const { text } = req.body;
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: "Message not found" });

        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }

        message.text = text;
        message.isEdited = true;
        await message.save();

        res.status(200).json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Get Conversations
export async function getConversations(req, res) {
    try {
        const type = req.query.type; // 'main' or 'requests'

        const currentUser = await User.findById(req.user.id);
        const blockedList = currentUser.blockedUsers.map(id => id.toString());

        let filter = { participants: req.user.id };

        if (type === 'requests') {
            // Pending and NOT initiated by me
            filter.status = 'pending';
            filter.initiator = { $ne: req.user.id };
        } else {
            // Main inbox: accepted OR pending-but-initiated-by-me (so I can see my sent requests)
            filter.$or = [
                { status: 'accepted' },
                { status: 'pending', initiator: req.user.id }
            ];
        }

        // Filter out blocked users (if participants contains someone in blockedList)
        // This is tricky in strict query, easier to filter in JS or specific exclusion
        // Simple way: 
        filter.participants = { $all: [req.user.id], $nin: blockedList };
        // Note: This $nin only checks if blockedList content is present in participants array. 
        // But participants contains User IDs. So if any blocked ID is in participants, it excludes. Good.

        const conversations = await Conversation.find(filter)
            .populate('participants', 'name avatar')
            .sort({ lastMessageAt: -1 });

        // Add unread counts
        const conversationsWithCount = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                sender: { $ne: req.user.id },
                read: false
            });
            return { ...conv.toObject(), unreadCount };
        }));

        res.status(200).json(conversationsWithCount);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Get Messages
export async function getMessages(req, res) {
    try {
        const { conversationId } = req.params;
        const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Accept Message Request
export async function acceptMessageRequest(req, res) {
    try {
        const { conversationId } = req.body;
        const conversation = await Conversation.findById(conversationId);

        if (!conversation.participants.includes(req.user.id)) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        conversation.status = 'accepted';
        await conversation.save();
        res.status(200).json({ message: "Accepted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

/* -------------------- NOTIFICATIONS -------------------- */

export async function getNotifications(req, res) {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .populate('sender', 'name username avatar')
            .populate('post', 'text image')
            .sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function markNotificationRead(req, res) {
    try {
        const notif = await Notification.findById(req.params.id);
        if (!notif) return res.status(404).json({ message: "Notification not found" });
        if (notif.recipient.toString() !== req.user.id) return res.status(401).json({ message: "Unauthorized" });

        notif.isRead = true;
        await notif.save();
        res.status(200).json({ message: "Marked as read" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function deleteAllNotifications(req, res) {
    try {
        await Notification.deleteMany({ recipient: req.user.id });
        res.status(200).json({ message: "Notifications cleared" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function getConnectionCount(req, res) {
    try {
        const userId = req.params.userId;
        const count = await ConnectionRequest.countDocuments({
            $or: [{ sender: userId }, { receiver: userId }],
            status: 'accepted'
        });
        res.status(200).json({ count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
// Remove Connection
export async function removeConnection(req, res) {
    try {
        const { targetId } = req.body;
        // Delete any accepted connection request between these two
        await ConnectionRequest.findOneAndDelete({
            $or: [
                { sender: req.user.id, receiver: targetId, status: 'accepted' },
                { sender: targetId, receiver: req.user.id, status: 'accepted' }
            ]
        });

        // Delete conversation
        await Conversation.findOneAndDelete({
            participants: { $all: [req.user.id, targetId] }
        });

        res.status(200).json({ message: "Connection removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Block User
export async function blockUser(req, res) {
    try {
        const { targetId } = req.body;
        const user = await User.findById(req.user.id);

        if (!user.blockedUsers.includes(targetId)) {
            user.blockedUsers.push(targetId);
            await user.save();
        }

        // Remove any connection
        await ConnectionRequest.findOneAndDelete({
            $or: [
                { sender: req.user.id, receiver: targetId },
                { sender: targetId, receiver: req.user.id }
            ]
        });

        // Delete conversation
        await Conversation.findOneAndDelete({
            participants: { $all: [req.user.id, targetId] }
        });

        res.status(200).json({ message: "User blocked" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Unblock User
export async function unblockUser(req, res) {
    try {
        const { targetId } = req.body;
        const user = await User.findById(req.user.id);

        user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== targetId);
        await user.save();

        res.status(200).json({ message: "User unblocked" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
