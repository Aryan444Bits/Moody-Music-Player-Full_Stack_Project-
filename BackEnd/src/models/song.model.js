const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a song title'],
      trim: true
    },
    artist: {
      type: String,
      required: [true, 'Please provide an artist name'],
      trim: true
    },
    audio: {
      type: String,
      required: [true, 'Please provide an audio URL']
    },
    audioUrl: {
      type: String
    },
    mood: {
      type: String,
      default: 'neutral',
      lowercase: true,
      trim: true
    },
    genre: {
      type: String,
      default: 'Unknown',
      trim: true
    },
    language: {
      type: String,
      default: 'Unknown',
      trim: true
    },
    energy: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    tags: {
      type: [String],
      default: []
    },
    duration: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Synchronize audio and audioUrl before saving
songSchema.pre('save', function (next) {
  if (this.audio && !this.audioUrl) {
    this.audioUrl = this.audio;
  } else if (this.audioUrl && !this.audio) {
    this.audio = this.audioUrl;
  }
  next();
});

// Backward compatibility transform for legacy document serialization
songSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (!ret.audioUrl && ret.audio) {
      ret.audioUrl = ret.audio;
    }
    if (!ret.audio && ret.audioUrl) {
      ret.audio = ret.audioUrl;
    }
    if (!ret.genre) ret.genre = 'Unknown';
    if (!ret.language) ret.language = 'Unknown';
    if (ret.energy === undefined || ret.energy === null) ret.energy = 50;
    if (!ret.tags) ret.tags = [];
    if (!ret.duration) ret.duration = 0;
    return ret;
  }
});

const song = mongoose.model('song', songSchema);

module.exports = song;