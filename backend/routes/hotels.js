import express from 'express';
import {
  getNearbyHotels,
  getAllHotels,
  createHotel,
  getAdminHotels,
  getAdminHotelsForUsers,
  createAdminHotel,
  deleteAdminHotel,
  getHotelReviews,
  createHotelReview,
  createAdminReviewReply,
} from '../controllers/hotelsController.js';
import { auth, isAdmin } from '../middleware/auth.js';
import { uploadHotelImage } from '../middleware/upload.js';

const router = express.Router();

const handleAdminHotelMultipart = (req, res, next) => {
  // Parse multipart/form-data (file + text fields) and surface multer errors consistently.
  uploadHotelImage.single('hotel_image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: 'Invalid multipart/form-data payload.',
        details: err.message,
      });
    }

    return next();
  });
};

router.get('/nearby', auth, getNearbyHotels);
router.get('/', auth, getAllHotels);
router.get('/featured', auth, getAdminHotelsForUsers);
router.post('/', auth, createHotel);
router.get('/admin', auth, isAdmin, getAdminHotels);
router.post('/admin', auth, isAdmin, handleAdminHotelMultipart, createAdminHotel);
router.delete('/admin/:hotelId', auth, isAdmin, deleteAdminHotel);
router.get('/:hotelId/reviews', auth, getHotelReviews);
router.post('/:hotelId/reviews', auth, createHotelReview);
router.post('/:hotelId/reviews/:reviewId/reply', auth, isAdmin, createAdminReviewReply);

export default router;