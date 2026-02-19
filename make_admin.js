import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/campus_connect';

mongoose.connect(uri)
    .then(async () => {
        console.log('Connected to DB');
        const email = 'moviesflixxer@gmail.com';
        const user = await User.findOneAndUpdate(
            { email },
            { role: 'Admin' },
            { new: true }
        );
        if (user) {
            console.log(`Updated User: ${user.email}`);
            console.log(`New Role: ${user.role}`);
        } else {
            console.log('User not found');
        }
        await mongoose.disconnect();
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
