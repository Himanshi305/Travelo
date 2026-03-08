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

  router.route('/').get(getDestinations).post(auth, isAdmin, createDestination);
  router
    .route('/:id')
    .get(getDestination)
    .put(auth, isAdmin, updateDestination)
    .delete(auth, isAdmin, deleteDestination);

  export default router;
