import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // If 'pending', the receiver hasn't accepted the message request yet.
    // 'accepted' means they can chat freely.
    status: {
        type: String,
        enum: ['pending', 'accepted'],
        default: 'pending'
    },
    // Track who started it so we know who needs to accept
    initiator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastMessage: { type: String },
    lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Conversation', conversationSchema);
