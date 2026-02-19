import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Student', 'Teacher', 'Admin'], default: 'Student' },
    avatar: { type: String },
    bio: { type: String },

    // Student & Teacher specific
    course: { type: String, enum: ['BCA', 'MCA', 'Tally', 'ADCA', 'DCA'] },
    year: { type: String },
    branch: { type: String },

    // Shared / Teacher specific
    idCardNumber: { type: String },
    mobileNumber: { type: String },

    // Approval status
    isApproved: { type: Boolean, default: true },

    // Moderation
    isBanned: { type: Boolean, default: false },
    banExpiresAt: { type: Date },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reportsReceived: [{
        reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

export default mongoose.model('User', userSchema);
