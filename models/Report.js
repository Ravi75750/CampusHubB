import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional: separate or combined with post
    targetType: { type: String, enum: ['Post', 'User'], required: true },
    reason: { type: String, enum: ['Violence', 'Abusive', 'Religional Hate/Speech', 'Other'], required: true },
    description: { type: String },
    course: { type: String, required: true }, // To filter for Teachers (e.g. "BCA")
    status: { type: String, enum: ['Pending', 'Solved', 'Rejected'], default: 'Pending' },
    resolutionNote: { type: String }
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);
