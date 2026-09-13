const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth.middleware');

// @route   GET /api/analytics
// @access  Private (Authenticated users only)
router.get('/', protect, getAnalytics);

module.exports = router;
