import express from 'express';
const router = express.Router();
import { register, login, logout } from '../controllers/authController.js';
import { check } from 'express-validator';

router.post(
  '/register',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  register
);

router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  login
);

router.post('/logout', logout);

export default router;
