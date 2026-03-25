import mongoose from 'mongoose';

const siteSettingsSchema = new mongoose.Schema({
    landingPageImage: {
        type: String,
        default: '/Homebg.jpg' // Default image if none is set
    }
}, { timestamps: true });

export default mongoose.model('SiteSettings', siteSettingsSchema);
