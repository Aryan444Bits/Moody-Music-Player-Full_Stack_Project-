const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a playlist name'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    songs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'song',
        required: true
      }
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Playlist = mongoose.model('Playlist', playlistSchema);

module.exports = Playlist;
