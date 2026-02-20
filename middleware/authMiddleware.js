import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const verifyToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: "Access Denied. No token provided." });
        }

        const verified = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user is banned
        const user = await User.findById(verified.id);
        if (user && user.isBanned) {
            return res.status(403).json({ message: "USER_BANNED" });
        }

        req.user = verified; // { id, role }
        next();
    } catch (error) {
        res.status(400).json({ message: "Invalid Token" });
    }
};

export const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        res.status(403).json({ message: "Access Denied. Admin only." });
    }
};
