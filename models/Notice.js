import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    important: { type: Boolean, default: false },
    expiresAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('Notice', noticeSchema);
