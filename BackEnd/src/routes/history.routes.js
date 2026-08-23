const express = require('express');
const router = express.Router();
const ListeningHistory = require('../models/history.model');
const { protect } = require('../middleware/auth.middleware');

// @route   POST /api/history
// @desc    Record a new listening event or update an existing listening session duration
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { songId, startedAt, completedAt, listeningDuration, detectedMood, sessionId, historyId } = req.body;

    // If historyId is provided, update existing listening event duration/completion
    if (historyId) {
      const existingHistory = await ListeningHistory.findOne({
        _id: historyId,
        userId: req.user._id
      });

      if (!existingHistory) {
        return res.status(404).json({ message: 'Listening history record not found' });
      }

      if (completedAt) existingHistory.completedAt = completedAt;
      if (listeningDuration !== undefined) existingHistory.listeningDuration = listeningDuration;
      await existingHistory.save();

      const populatedHistory = await ListeningHistory.findById(existingHistory._id).populate('songId');

      return res.status(200).json({
        message: 'Listening event updated',
        history: populatedHistory
      });
    }

    if (!songId) {
      return res.status(400).json({ message: 'songId is required' });
    }

    const history = await ListeningHistory.create({
      userId: req.user._id,
      songId,
      startedAt: startedAt || new Date(),
      completedAt: completedAt || null,
      listeningDuration: listeningDuration || 0,
      detectedMood: detectedMood || 'neutral',
      sessionId: sessionId || null
    });

    const populatedHistory = await ListeningHistory.findById(history._id).populate('songId');

    return res.status(201).json({
      message: 'Listening event recorded',
      history: populatedHistory
    });
  } catch (error) {
    console.error('Error recording listening history:', error);
    return res.status(500).json({
      message: 'Failed to record listening history',
      error: error.message
    });
  }
});

// @route   GET /api/history
// @desc    Get current authenticated user's listening history
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const history = await ListeningHistory.find({ userId: req.user._id })
      .populate('songId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: 'Listening history fetched successfully',
      history
    });
  } catch (error) {
    console.error('Error fetching listening history:', error);
    return res.status(500).json({
      message: 'Failed to fetch listening history',
      error: error.message
    });
  }
});

// @route   DELETE /api/history
// @desc    Clear current authenticated user's listening history
// @access  Private
router.delete('/', protect, async (req, res) => {
  try {
    await ListeningHistory.deleteMany({ userId: req.user._id });
    return res.status(200).json({
      message: 'Listening history cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing listening history:', error);
    return res.status(500).json({
      message: 'Failed to clear listening history',
      error: error.message
    });
  }
});

module.exports = router;
