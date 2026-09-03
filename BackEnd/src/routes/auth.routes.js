const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { registerUser, loginUser, getMe } = require('../controllers/auth.controller');

// @route   POST /api/auth/register
router.post('/register', registerUser);

// @route   POST /api/auth/login
router.post('/login', loginUser);

// @route   GET /api/auth/me
router.get('/me', protect, getMe);

module.exports = router;
