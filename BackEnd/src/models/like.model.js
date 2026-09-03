const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
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
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate likes for the same user and song
likeSchema.index({ userId: 1, songId: 1 }, { unique: true });

const Like = mongoose.model('Like', likeSchema);

module.exports = Like;
