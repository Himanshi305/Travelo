import express from 'express';
import {
  getDestinations,
  getDestination,
  createDestination,
  updateDestination,
  deleteDestination,
} from '../controllers/destinationController.js';
import { auth, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all destinations
router.get('/', auth, getDestinations);

// Create destination (Authenticated users)
router.post('/', auth, createDestination);

// Get single destination
router.get('/:id', auth, getDestination);

// Update destination (Admin only)
router.put('/:id', auth, isAdmin, updateDestination);

// Delete destination (Admin only)
router.delete('/:id', auth, isAdmin, deleteDestination);

export default router;