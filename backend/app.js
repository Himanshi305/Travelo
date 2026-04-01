import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import destinationRoutes from './routes/destinations.js';

console.log("app.js is running");

const app = express();

const corsOptions = {
    origin: 'http://localhost:3000', // Frontend URL
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}
app.use(express.json());
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

import hotelsRoutes from './routes/hotels.js';
import bookingsRoutes from './routes/bookings.js';

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/hotels', hotelsRoutes);
app.use('/api/bookings', bookingsRoutes);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use((error, req, res, _next) => {
    if (!error) {
        return res.status(500).json({ success: false, error: 'Unknown server error' });
    }

    console.error(error);

    const statusCode = Number(error?.http_code) || Number(error?.statusCode) || 500;
    const message = error?.message || error?.error?.message || 'Server error';

    return res.status(statusCode).json({
        success: false,
        error: message,
    });
});

export default app;