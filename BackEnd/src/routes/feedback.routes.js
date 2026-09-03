const express = require('express');
const router = express.Router();
const Like = require('../models/like.model');
const Feedback = require('../models/feedback.model');
const Song = require('../models/song.model');
const { protect } = require('../middleware/auth.middleware');

// @route   POST /api/feedback/like
// @desc    Like a song for the current authenticated user (Idempotent / Prevents Duplicate Likes)
// @access  Private
router.post('/like', protect, async (req, res) => {
  try {
    const { songId } = req.body;

    if (!songId) {
      return res.status(400).json({ message: 'songId is required' });
    }

    // Verify song exists
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Upsert ensures duplicate likes cannot be created even under race conditions
    const like = await Like.findOneAndUpdate(
      { userId: req.user._id, songId },
      { userId: req.user._id, songId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: 'Song liked successfully',
      like
    });
  } catch (error) {
    console.error('Error liking song:', error);
    return res.status(500).json({
      message: 'Failed to like song',
      error: error.message
    });
  }
});

// @route   POST /api/feedback/unlike
// @desc    Unlike a song for the current authenticated user
// @access  Private
router.post('/unlike', protect, async (req, res) => {
  try {
    const { songId } = req.body;

    if (!songId) {
      return res.status(400).json({ message: 'songId is required' });
    }

    await Like.deleteOne({
      userId: req.user._id,
      songId
    });

    return res.status(200).json({
      message: 'Song unliked successfully'
    });
  } catch (error) {
    console.error('Error unliking song:', error);
    return res.status(500).json({
      message: 'Failed to unlike song',
      error: error.message
    });
  }
});

// @route   DELETE /api/feedback/like/:songId
// @desc    Unlike a song using DELETE HTTP method
// @access  Private
router.delete('/like/:songId', protect, async (req, res) => {
  try {
    const { songId } = req.params;

    await Like.deleteOne({
      userId: req.user._id,
      songId
    });

    return res.status(200).json({
      message: 'Song unliked successfully'
    });
  } catch (error) {
    console.error('Error unliking song:', error);
    return res.status(500).json({
      message: 'Failed to unlike song',
      error: error.message
    });
  }
});

// @route   GET /api/feedback/liked
// @desc    Get all liked songs for current authenticated user
// @access  Private
router.get('/liked', protect, async (req, res) => {
  try {
    const likes = await Like.find({ userId: req.user._id })
      .populate('songId')
      .sort({ createdAt: -1 });

    const likedSongs = likes.map((l) => l.songId).filter(Boolean);
    const likedSongIds = likes.map((l) => (l.songId ? (l.songId._id || l.songId).toString() : null)).filter(Boolean);

    return res.status(200).json({
      message: 'Liked songs fetched successfully',
      likedSongIds,
      likedSongs
    });
  } catch (error) {
    console.error('Error fetching liked songs:', error);
    return res.status(500).json({
      message: 'Failed to fetch liked songs',
      error: error.message
    });
  }
});

// @route   POST /api/feedback/skip
// @desc    Record a skip activity for a song
// @access  Private
router.post('/skip', protect, async (req, res) => {
  try {
    const { songId } = req.body;

    if (!songId) {
      return res.status(400).json({ message: 'songId is required' });
    }

    const feedback = await Feedback.create({
      userId: req.user._id,
      songId,
      action: 'skip'
    });

    return res.status(201).json({
      message: 'Skip activity recorded successfully',
      feedback
    });
  } catch (error) {
    console.error('Error recording skip:', error);
    return res.status(500).json({
      message: 'Failed to record skip activity',
      error: error.message
    });
  }
});

// @route   POST /api/feedback/replay
// @desc    Record a replay activity for a song
// @access  Private
router.post('/replay', protect, async (req, res) => {
  try {
    const { songId } = req.body;

    if (!songId) {
      return res.status(400).json({ message: 'songId is required' });
    }

    const feedback = await Feedback.create({
      userId: req.user._id,
      songId,
      action: 'replay'
    });

    return res.status(201).json({
      message: 'Replay activity recorded successfully',
      feedback
    });
  } catch (error) {
    console.error('Error recording replay:', error);
    return res.status(500).json({
      message: 'Failed to record replay activity',
      error: error.message
    });
  }
});

module.exports = router;
