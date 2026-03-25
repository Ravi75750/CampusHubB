import User from '../models/User.js';
import OTP from '../models/OTP.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS
    }
});

export async function checkUsername(req, res) {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username: username.toLowerCase() });
        res.json({ available: !user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function registerStep1(req, res) {
    try {
        let { username, email, mobileNumber, role } = req.body;
        
        if (role === 'Teacher') {
            if (!username && mobileNumber) username = `T_${mobileNumber}`;
            if (!email && mobileNumber) email = `${mobileNumber}@teacher.campusconnect`;
        }

        if (!username || !email) {
            return res.status(400).json({ message: "Missing required fields (Username/Email)" });
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ message: "Email already registered" });

        const existingUsername = await User.findOne({ username: username.toLowerCase() });
        if (existingUsername) return res.status(400).json({ message: "Username already taken" });

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        // const otpCode = "123456"; // For testing, hardcode if necessary, but we'll use rand
        
        await OTP.deleteMany({ email });
        await OTP.create({ email, otp: otpCode });

        try {
            if (process.env.NODEMAILER_USER && process.env.NODEMAILER_PASS) {
                await transporter.sendMail({
                    from: process.env.NODEMAILER_USER,
                    to: email,
                    subject: 'CampusConnect Registration OTP',
                    text: `Your Registration OTP is: ${otpCode}. It expires in 5 minutes.`
                });
            }
        } catch (emailErr) {
            console.error("Email send error:", emailErr);
        }
        
        console.log(`[DEV ONLY] Registration OTP for ${email}: ${otpCode}`);
        res.status(200).json({ message: "OTP sent to email" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function registerStep2(req, res) {
    try {
        const { name, username, email, password, role, course, idCardNumber, mobileNumber, otp } = req.body;

        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) return res.status(400).json({ message: "Invalid or expired OTP" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = {
            name,
            username: username.toLowerCase(),
            email,
            password: hashedPassword,
            course,
            role: role || 'Student',
            avatar: req.file ? req.file.path : `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(/ /g, '')}`,
            idCardNumber
        };

        if (role === 'Teacher') {
            userData.mobileNumber = mobileNumber;
            userData.isApproved = false;
        } else if (role === 'Admin') {
            userData.isApproved = true;
        }

        const newUser = new User(userData);
        const savedUser = await newUser.save();
        await OTP.deleteOne({ _id: otpRecord._id });

        if (savedUser.role === 'Teacher' && !savedUser.isApproved) {
            return res.status(201).json({
                message: 'Registration successful. Waiting for admin approval.',
                user: { id: savedUser._id, name: savedUser.name, email: savedUser.email, role: savedUser.role }
            });
        }

        const token = jwt.sign({ id: savedUser._id, role: savedUser.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: savedUser._id, name: savedUser.name, email: savedUser.email, role: savedUser.role, avatar: savedUser.avatar, isApproved: savedUser.isApproved }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function loginStep1(req, res) {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({
            $or: [{ email: email }, { mobileNumber: email }, { idCardNumber: email }]
        });

        if (!user) return res.status(404).json({ message: "User not found. Please register." });

        if (user.role === 'Teacher' && !user.isApproved) {
            return res.status(403).json({ message: "Account pending approval" });
        }

        if (user.isBanned) {
            if (user.banExpiresAt && user.banExpiresAt > new Date()) {
                return res.status(403).json({ message: `You are banned until ${user.banExpiresAt.toDateString()}` });
            } else {
                user.isBanned = false;
                user.banExpiresAt = null;
                await user.save();
            }
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await OTP.deleteMany({ email: user.email });
        await OTP.create({ email: user.email, otp: otpCode });

        try {
            if (process.env.NODEMAILER_USER && process.env.NODEMAILER_PASS) {
                await transporter.sendMail({
                    from: process.env.NODEMAILER_USER,
                    to: user.email,
                    subject: 'CampusConnect Login OTP',
                    text: `Your Login OTP is: ${otpCode}. It expires in 5 minutes.`
                });
            }
        } catch (emailErr) {
            console.error("Email send error:", emailErr);
        }
        
        console.log(`[DEV ONLY] Login OTP for ${user.email}: ${otpCode}`);
        res.status(200).json({ message: "OTP sent", userEmail: user.email });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function loginStep2(req, res) {
    try {
        const { email, otp } = req.body;
        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) return res.status(400).json({ message: "Invalid or expired OTP" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found." });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        await OTP.deleteOne({ _id: otpRecord._id });

        res.status(200).json({
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, isApproved: user.isApproved }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


export async function getMe(req, res) {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({
            id: user._id,
            ...user.toObject()
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
}

export async function getUserById(req, res) {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function updateUser(req, res) {
    try {
        console.log("Update User Request Body:", req.body);
        console.log("Update User File:", req.file);

        const { name, course, year, bio, mobileNumber } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ message: "User not found" });

        if (name) user.name = name;
        if (course) user.course = course;
        if (year) user.year = year;
        if (bio) user.bio = bio;
        if (mobileNumber) user.mobileNumber = mobileNumber;

        if (req.file) {
            user.avatar = req.file.path;
        }

        await user.save();

        res.json({
            message: "Profile updated successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                course: user.course,
                year: user.year,
                bio: user.bio,
                isApproved: user.isApproved
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function searchUsers(req, res) {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ message: "Search query required" });

        const users = await User.find({
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { username: { $regex: q, $options: 'i' } }
            ]
        }).select('name username avatar role _id');

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

