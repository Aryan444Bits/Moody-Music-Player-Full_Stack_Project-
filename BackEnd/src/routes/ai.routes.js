const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/auth.middleware');
const { testAIConnection, processMusicQuery } = require('../controllers/ai.controller');

// @route   POST /api/ai/test
// @access  Protected (JWT Auth required, Dev mode only)
router.post('/test', protect, testAIConnection);

// @route   POST /api/ai/music-query
// @access  Optional Protect (Authenticated or Guest users)
router.post('/music-query', optionalProtect, processMusicQuery);

module.exports = router;
