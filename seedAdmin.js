import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'moviesflixxer@gmail.com';
        const existingAdmin = await User.findOne({ email });
        if (existingAdmin) {
            console.log('Admin already exists, updating...');
            await User.deleteOne({ email });
        }

        const hashedPassword = await bcrypt.hash('rs12345&', 10);
        const admin = new User({
            name: 'Super Admin',
            email,
            username: 'superadmin',
            password: hashedPassword,
            role: 'Admin',
            isApproved: true,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
        });

        await admin.save();
        console.log('Admin user created successfully');
        console.log('Email: moviesflixxer@gmail.com');
        console.log('Password: rs12345&');
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

seedAdmin();
