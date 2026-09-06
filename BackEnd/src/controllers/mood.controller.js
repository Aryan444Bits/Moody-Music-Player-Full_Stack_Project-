const MoodHistory = require('../models/moodHistory.model');

// @desc    Record a mood detection event
// @route   POST /api/moods
// @access  Private
const recordMood = async (req, res) => {
  try {
    const { dominantEmotion, emotionProbabilities, sessionId, timestamp } = req.body;

    if (!dominantEmotion) {
      return res.status(400).json({ message: 'dominantEmotion is required' });
    }

    const moodRecord = await MoodHistory.create({
      userId: req.user._id,
      dominantEmotion,
      emotionProbabilities: emotionProbabilities || {},
      sessionId: sessionId || null,
      timestamp: timestamp || new Date()
    });

    return res.status(201).json({
      message: 'Mood detection recorded successfully',
      mood: moodRecord
    });
  } catch (error) {
    console.error('Error recording mood history:', error);
    return res.status(500).json({
      message: 'Failed to record mood detection',
      error: error.message
    });
  }
};

// @desc    Get current user's mood detection history
// @route   GET /api/moods
// @access  Private
const getMoodHistory = async (req, res) => {
  try {
    const moods = await MoodHistory.find({ userId: req.user._id })
      .sort({ timestamp: -1 });

    return res.status(200).json({
      message: 'Mood history fetched successfully',
      moods
    });
  } catch (error) {
    console.error('Error fetching mood history:', error);
    return res.status(500).json({
      message: 'Failed to fetch mood history',
      error: error.message
    });
  }
};

// @desc    Delete mood history (clear all or delete specific record by id)
// @route   DELETE /api/moods
// @access  Private
const deleteMoodHistory = async (req, res) => {
  try {
    const moodId = req.query.id || req.params.id;

    if (moodId) {
      const deleted = await MoodHistory.findOneAndDelete({
        _id: moodId,
        userId: req.user._id
      });

      if (!deleted) {
        return res.status(404).json({ message: 'Mood history record not found' });
      }

      return res.status(200).json({
        message: 'Mood history record deleted successfully',
        deletedId: moodId
      });
    }

    // Delete all records for current user
    const result = await MoodHistory.deleteMany({ userId: req.user._id });

    return res.status(200).json({
      message: 'All mood history cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting mood history:', error);
    return res.status(500).json({
      message: 'Failed to delete mood history',
      error: error.message
    });
  }
};

module.exports = {
  recordMood,
  getMoodHistory,
  deleteMoodHistory
};
