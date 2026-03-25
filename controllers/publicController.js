import SiteSettings from '../models/SiteSettings.js';

export const getSiteSettings = async (req, res) => {
    try {
        let settings = await SiteSettings.findOne();
        if (!settings) {
            settings = await SiteSettings.create({});
        }
        res.status(200).json(settings);
    } catch (error) {
        console.error("Error fetching site settings:", error);
        res.status(500).json({ message: "Server error while fetching settings" });
    }
};
