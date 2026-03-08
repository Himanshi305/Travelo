import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import destinationRoutes from './routes/destinations.js';
import connectDB from './config/db.js';

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

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/destinations', destinationRoutes);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

export default app;