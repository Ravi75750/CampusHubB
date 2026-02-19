import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/campus_connect';

console.log('Connecting to', uri);

mongoose.connect(uri)
    .then(async () => {
        console.log('Connected to DB');
        const email = 'mrbadshaff@gmail.com';
        const user = await User.findOne({ email });
        if (user) {
            console.log(`User Found: ${user.email}`);
            console.log(`Role: ${user.role}`);
            console.log(`ID: ${user._id}`);
        } else {
            console.log('User not found');
        }
        await mongoose.disconnect();
        console.log('Disconnected');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
