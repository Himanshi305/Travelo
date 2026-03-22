import express from 'express';
import {
  getNearbyHotels,
  getAllHotels,
  createHotel,
} from '../controllers/hotelsController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/nearby', auth, getNearbyHotels);
router.get('/', auth, getAllHotels);
router.post('/', auth, createHotel);

export default router;