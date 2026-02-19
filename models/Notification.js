import { Schema, model } from 'mongoose';

const notificationSchema = new Schema({
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['like', 'comment', 'connection_request', 'connection_accepted', 'report_update'],
        required: true
    },
    post: { type: Schema.Types.ObjectId, ref: 'Post' }, // Optional, for likes/comments
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

export default model('Notification', notificationSchema);
