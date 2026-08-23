const mongoose = require('mongoose');

const listeningHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'song',
      required: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date
    },
    listeningDuration: {
      type: Number,
      default: 0
    },
    detectedMood: {
      type: String
    },
    sessionId: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

const ListeningHistory = mongoose.model('ListeningHistory', listeningHistorySchema);

module.exports = ListeningHistory;
