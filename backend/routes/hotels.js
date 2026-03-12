import express from 'express';
import {
  getNearbyHotels,
  getAllHotels,
  createHotel,
} from '../controllers/hotelsController.js';

const router = express.Router();

router.get('/nearby', getNearbyHotels);
router.get('/', getAllHotels);
router.post('/', createHotel);

export default router;