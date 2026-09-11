const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/auth.middleware');
const {
  testAIConnection,
  processMusicQuery,
  generateAIPlaylist,
  saveAIPlaylist,
  suggestMetadata
} = require('../controllers/ai.controller');

// @route   POST /api/ai/test
// @access  Protected (JWT Auth required, Dev mode only)
router.post('/test', protect, testAIConnection);

// @route   POST /api/ai/music-query
// @access  Optional Protect (Authenticated or Guest users)
router.post('/music-query', optionalProtect, processMusicQuery);

// @route   POST /api/ai/generate-playlist
// @access  Optional Protect (Authenticated or Guest users)
router.post('/generate-playlist', optionalProtect, generateAIPlaylist);

// @route   POST /api/ai/save-playlist
// @access  Protected (JWT Auth required)
router.post('/save-playlist', protect, saveAIPlaylist);

// @route   POST /api/ai/suggest-metadata
// @access  Protected (JWT Auth required)
router.post('/suggest-metadata', protect, suggestMetadata);

module.exports = router;
