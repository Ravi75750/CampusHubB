import User from '../models/User.js';
import Post from '../models/Post.js';
import Notice from '../models/Notice.js';
import bcrypt from 'bcryptjs';
import OTP from '../models/OTP.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import 'dotenv/config';

// Transporter for Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS
    }
});

export async function login(req, res) {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || user.role !== 'Admin') {
            return res.status(401).json({ message: "Access Denied" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        // const otpCode = "123456"; // FIXED OTP for easy login (since email is not configured)

        await OTP.deleteMany({ email });
        await OTP.create({ email, otp: otpCode });

        try {
            if (process.env.NODEMAILER_USER && process.env.NODEMAILER_PASS) {
                await transporter.sendMail({
                    from: process.env.NODEMAILER_USER,
                    to: email,
                    subject: 'CampusConnect Admin Login OTP',
                    text: `Your Admin Login OTP is: ${otpCode}. It expires in 5 minutes.`
                });
                console.log(`OTP sent to ${email}`);
            } else {
                console.warn("Nodemailer credentials missing. OTP logging to console.");
            }
        } catch (emailErr) {
            console.error("Email send error:", emailErr);
            // Fallback for development: Don't block login if email fails
        }

        // ALWAYS log OTP in dev/debug mode or if email fails so user can login
        console.log(`[DEV ONLY] OTP for ${email}: ${otpCode}`);

        res.status(200).json({ message: "OTP sent (Check server console if not received)" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
}

export async function verifyOTP(req, res) {
    try {
        const { email, otp } = req.body;

        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        const user = await User.findOne({ email });
        if (!user || user.role !== 'Admin') {
            return res.status(401).json({ message: "Access Denied" });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        await OTP.deleteOne({ _id: otpRecord._id });

        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
}

// --- User Management ---

export async function getPendingTeachers(req, res) {
    try {
        const teachers = await User.find({ role: 'Teacher', isApproved: false });
        res.status(200).json(teachers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function approveTeacher(req, res) {
    try {
        const { id } = req.params;
        const teacher = await User.findByIdAndUpdate(id, { isApproved: true }, { new: true });

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        res.status(200).json({ message: "Teacher approved successfully", teacher });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function getAllUsers(req, res) {
    try {
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function createStudent(req, res) {
    try {
        const { name, email, password, course, idCardNumber } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const student = new User({
            name,
            email,
            password: hashedPassword,
            role: 'Student',
            course,
            idCardNumber,
            isApproved: true, // Admin created, so approved
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(' ', '')}`
        });

        await student.save();
        res.status(201).json({ message: "Student created successfully", student });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function deleteUser(req, res) {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function updateUser(req, res) {
    try {
        const updates = req.body;
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }
        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// --- Reports ---

export async function getReports(req, res) {
    try {
        const reportedPosts = await Post.find({ 'reports.0': { $exists: true } }).populate('reports.reporterId', 'name');
        const reportedUsers = await User.find({ 'reportsReceived.0': { $exists: true } }).populate('reportsReceived.reporterId', 'name');

        res.status(200).json({ posts: reportedPosts, users: reportedUsers });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// --- Notices ---

export async function createNotice(req, res) {
    try {
        const { title, content, important, expiresAt } = req.body;
        const notice = new Notice({
            title,
            content,
            important,
            expiresAt,
            author: req.user.id
        });
        await notice.save();
        res.status(201).json(notice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function getNotices(req, res) { // Publicly accessible or authenticated?
    try {
        const notices = await Notice.find({
            $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }]
        }).sort({ createdAt: -1 });
        res.status(200).json(notices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function deleteNotice(req, res) {
    try {
        await Notice.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Notice deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
