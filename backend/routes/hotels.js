import express from 'express';
import {
  getNearbyHotels,
  getAllHotels,
  createHotel,
  getHotelReviews,
  createHotelReview,
} from '../controllers/hotelsController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/nearby', auth, getNearbyHotels);
router.get('/', auth, getAllHotels);
router.post('/', auth, createHotel);
router.get('/:hotelId/reviews', auth, getHotelReviews);
router.post('/:hotelId/reviews', auth, createHotelReview);

export default router;