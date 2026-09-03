const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
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
    action: {
      type: String,
      enum: ['skip', 'replay'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

feedbackSchema.index({ userId: 1, action: 1 });
feedbackSchema.index({ songId: 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
