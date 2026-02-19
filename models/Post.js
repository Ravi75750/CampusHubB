import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
    content: { type: String, required: true },
    image: { type: String }, // URL or Base64
    text: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isArchived: { type: Boolean, default: false },
    items: { type: [String] }, // Tags or related items
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
        text: String,
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
        replies: [{
            text: String,
            author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            createdAt: { type: Date, default: Date.now }
        }]
    }],
    reports: [{
        reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

export default mongoose.model('Post', postSchema);
