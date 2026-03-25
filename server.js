import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import moderationRoutes from './routes/moderationRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
import publicRoutes from './routes/publicRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection (MongoDB)
console.log('Attempting to connect to MongoDB...');
// Masking password for security in logs
const maskedURI = (process.env.MONGO_URI || '').replace(/:([^:@]+)@/, ':****@');
console.log(`URI: ${maskedURI}`);

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campus_connect')
    .then(() => console.log('Connected to MongoDB Successfully'))
    .catch(err => {
        console.error('MongoDB Connection Failed:', err.message);
        console.error('Full Error:', err);
    });

// Basic Route
app.get('/', (req, res) => {
    res.send('Campus Connect API is running');
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/public', publicRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
