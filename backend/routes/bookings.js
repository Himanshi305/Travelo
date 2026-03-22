import express from 'express';
import { createBooking, getBookings } from '../controllers/bookingController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, getBookings);
router.post('/', auth, createBooking);

export default router;
