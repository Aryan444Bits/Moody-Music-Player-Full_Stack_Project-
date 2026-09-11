const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { testAIConnection } = require('../controllers/ai.controller');

// @route   POST /api/ai/test
// @access  Protected (JWT Auth required, Dev mode only)
router.post('/test', protect, testAIConnection);

module.exports = router;
