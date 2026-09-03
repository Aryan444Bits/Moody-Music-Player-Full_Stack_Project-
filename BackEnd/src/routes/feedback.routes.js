const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  likeSong,
  unlikeSong,
  getLikedSongs,
  recordSkip,
  recordReplay
} = require('../controllers/feedback.controller');

// @route   POST /api/feedback/like
router.post('/like', protect, likeSong);

// @route   POST /api/feedback/unlike
router.post('/unlike', protect, unlikeSong);

// @route   DELETE /api/feedback/like/:songId
router.delete('/like/:songId', protect, unlikeSong);

// @route   GET /api/feedback/liked
router.get('/liked', protect, getLikedSongs);

// @route   POST /api/feedback/skip
router.post('/skip', protect, recordSkip);

// @route   POST /api/feedback/replay
router.post('/replay', protect, recordReplay);

module.exports = router;
