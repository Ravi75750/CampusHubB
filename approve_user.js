const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campus_connect')
    .then(async () => {
        console.log('Connected to MongoDB');
        const user = await User.findOne({ email: 'test@example.com' });
        if (user) {
            user.isApproved = true;
            await user.save();
            console.log('User approved:', user.email);
        } else {
            console.log('User not found');
        }
        mongoose.disconnect();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
