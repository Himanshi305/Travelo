import express from 'express';
import {
  getNearbyHotels,
  getAllHotels,
  createHotel,
  getAdminHotels,
  getAdminHotelsForUsers,
  createAdminHotel,
  getHotelReviews,
  createHotelReview,
  createAdminReviewReply,
} from '../controllers/hotelsController.js';
import { auth, isAdmin } from '../middleware/auth.js';
import { uploadHotelImage } from '../middleware/upload.js';

const router = express.Router();

router.get('/nearby', auth, getNearbyHotels);
router.get('/', auth, getAllHotels);
router.get('/featured', auth, getAdminHotelsForUsers);
router.post('/', auth, createHotel);
router.get('/admin', auth, isAdmin, getAdminHotels);
router.post('/admin', auth, isAdmin, uploadHotelImage.single('hotel_image'), createAdminHotel);
router.get('/:hotelId/reviews', auth, getHotelReviews);
router.post('/:hotelId/reviews', auth, createHotelReview);
router.post('/:hotelId/reviews/:reviewId/reply', auth, isAdmin, createAdminReviewReply);

export default router;