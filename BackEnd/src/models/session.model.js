const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sessionId: {
      type: String,
      required: true,
      unique: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active'
    },
    initialMood: {
      type: String
    },
    finalMood: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

sessionSchema.index({ userId: 1, startedAt: -1 });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
