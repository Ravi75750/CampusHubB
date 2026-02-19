import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: String, required: true }, // Keeping simple string for "25 DEC" format or use Date
    time: { type: String, required: true },
    location: { type: String, required: true },
    category: { type: String, required: true },
    image: { type: String },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Event', eventSchema);
