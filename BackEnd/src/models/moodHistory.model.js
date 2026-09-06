const mongoose = require('mongoose');

const moodHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    dominantEmotion: {
      type: String,
      required: true
    },
    emotionProbabilities: {
      happy: { type: Number, default: 0 },
      sad: { type: Number, default: 0 },
      angry: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      surprised: { type: Number, default: 0 },
      fearful: { type: Number, default: 0 },
      disgusted: { type: Number, default: 0 }
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    sessionId: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

moodHistorySchema.index({ userId: 1, timestamp: -1 });

const MoodHistory = mongoose.model('MoodHistory', moodHistorySchema);

module.exports = MoodHistory;
