const mongoose = require('mongoose');
const User = require('../models/user.model');
const Song = require('../models/song.model');
const ListeningHistory = require('../models/history.model');
const MoodHistory = require('../models/moodHistory.model');
const Like = require('../models/like.model');
const Feedback = require('../models/feedback.model');
const Session = require('../models/session.model');
const uploadFile = require('../service/storage.service');

// Helper to parse tags safely
const parseTags = (tagsInput) => {
  if (!tagsInput) return [];
  if (Array.isArray(tagsInput)) {
    return tagsInput.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof tagsInput === 'string') {
    return tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return [];
};

// Helper to parse energy level (0-100)
const parseEnergy = (energyInput) => {
  const val = Number(energyInput);
  if (isNaN(val)) return 50;
  return Math.min(100, Math.max(0, val));
};

// @desc    Get admin overview metrics
// @route   GET /api/admin/overview
// @access  Private/Admin
const getAdminOverview = async (req, res) => {
  try {
    const [totalUsers, totalSongs, totalPlays, totalMoodScans, recentSongs, recentUsers, dominantMoodRes] =
      await Promise.all([
        User.countDocuments(),
        Song.countDocuments(),
        ListeningHistory.countDocuments(),
        MoodHistory.countDocuments(),
        Song.find().sort({ createdAt: -1 }).limit(5),
        User.find().select('-password').sort({ createdAt: -1 }).limit(5),
        MoodHistory.aggregate([
          { $group: { _id: '$dominantEmotion', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 1 }
        ])
      ]);

    const dominantMood = dominantMoodRes.length > 0 ? dominantMoodRes[0]._id : 'neutral';

    return res.status(200).json({
      message: 'Admin overview fetched successfully',
      overview: {
        totalUsers,
        totalSongs,
        totalPlays,
        totalMoodScans,
        dominantMood,
        recentSongs,
        recentUsers
      }
    });
  } catch (error) {
    console.error('Error fetching admin overview:', error);
    return res.status(500).json({ message: 'Failed to fetch admin overview', error: error.message });
  }
};

// @desc    Get all songs for admin management
// @route   GET /api/admin/songs
// @access  Private/Admin
const getAdminSongs = async (req, res) => {
  try {
    const { search, genre, mood } = req.query;
    const filter = {};

    if (genre) filter.genre = { $regex: new RegExp(genre.trim(), 'i') };
    if (mood) filter.mood = mood.trim().toLowerCase();
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: searchRegex }, { artist: searchRegex }, { tags: searchRegex }];
    }

    const songs = await Song.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      message: 'Admin songs fetched successfully',
      songs
    });
  } catch (error) {
    console.error('Error fetching admin songs:', error);
    return res.status(500).json({ message: 'Failed to fetch songs', error: error.message });
  }
};

// @desc    Upload song audio and save metadata
// @route   POST /api/admin/songs
// @access  Private/Admin
const uploadAdminSong = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Audio file is required' });
    }
    if (!req.body.title || !req.body.artist) {
      return res.status(400).json({ message: 'Title and Artist are required' });
    }

    const fileData = await uploadFile(req.file);

    const song = await Song.create({
      title: req.body.title.trim(),
      artist: req.body.artist.trim(),
      audio: fileData.url,
      audioUrl: fileData.url,
      mood: req.body.mood ? req.body.mood.trim().toLowerCase() : 'neutral',
      genre: req.body.genre ? req.body.genre.trim() : 'Unknown',
      language: req.body.language ? req.body.language.trim() : 'Unknown',
      energy: parseEnergy(req.body.energy),
      tags: parseTags(req.body.tags),
      duration: req.body.duration ? Math.max(0, Number(req.body.duration) || 0) : 0,
      createdBy: req.user._id
    });

    return res.status(201).json({
      message: 'Song uploaded successfully',
      song
    });
  } catch (error) {
    console.error('Error uploading song as admin:', error);
    return res.status(500).json({ message: 'Failed to upload song', error: error.message });
  }
};

// @desc    Update song metadata
// @route   PUT /api/admin/songs/:id
// @access  Private/Admin
const updateAdminSong = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    const { title, artist, mood, genre, language, energy, tags, duration } = req.body;

    if (title) song.title = title.trim();
    if (artist) song.artist = artist.trim();
    if (mood) song.mood = mood.trim().toLowerCase();
    if (genre) song.genre = genre.trim();
    if (language) song.language = language.trim();
    if (energy !== undefined) song.energy = parseEnergy(energy);
    if (tags !== undefined) song.tags = parseTags(tags);
    if (duration !== undefined) song.duration = Math.max(0, Number(duration) || 0);

    await song.save();

    return res.status(200).json({
      message: 'Song metadata updated successfully',
      song
    });
  } catch (error) {
    console.error('Error updating song metadata:', error);
    return res.status(500).json({ message: 'Failed to update song metadata', error: error.message });
  }
};

// @desc    Delete song by ID
// @route   DELETE /api/admin/songs/:id
// @access  Private/Admin
const deleteAdminSong = async (req, res) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Clean up associated relations
    await Promise.all([
      ListeningHistory.deleteMany({ songId: req.params.id }),
      Like.deleteMany({ songId: req.params.id }),
      Feedback.deleteMany({ songId: req.params.id })
    ]);

    return res.status(200).json({
      message: 'Song deleted successfully',
      deletedId: req.params.id
    });
  } catch (error) {
    console.error('Error deleting song:', error);
    return res.status(500).json({ message: 'Failed to delete song', error: error.message });
  }
};

// @desc    Get all users for admin management
// @route   GET /api/admin/users
// @access  Private/Admin
const getAdminUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    return res.status(200).json({
      message: 'Users fetched successfully',
      users
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

// @desc    Get specific user's detailed statistics
// @route   GET /api/admin/users/:id/stats
// @access  Private/Admin
const getUserStats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.id);
    const targetUser = await User.findById(userId).select('-password');
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [totalPlays, totalListeningTimeRes, likedCount, sessionCount, moodCounts] = await Promise.all([
      ListeningHistory.countDocuments({ userId }),
      ListeningHistory.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalSeconds: { $sum: '$listeningDuration' } } }
      ]),
      Like.countDocuments({ userId }),
      Session.countDocuments({ userId }),
      MoodHistory.aggregate([
        { $match: { userId } },
        { $group: { _id: '$dominantEmotion', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    const totalSeconds = totalListeningTimeRes.length > 0 ? totalListeningTimeRes[0].totalSeconds : 0;
    const dominantMood = moodCounts.length > 0 ? moodCounts[0]._id : 'N/A';

    return res.status(200).json({
      message: 'User statistics fetched successfully',
      user: targetUser,
      stats: {
        totalPlays,
        totalListeningSeconds: totalSeconds,
        likedCount,
        sessionCount,
        dominantMood,
        moodCounts
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return res.status(500).json({ message: 'Failed to fetch user statistics', error: error.message });
  }
};

// @desc    Toggle user status (enable/disable user account)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const toggleUserStatus = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot disable your own admin account' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    targetUser.isDisabled = !targetUser.isDisabled;
    await targetUser.save();

    return res.status(200).json({
      message: `User account has been ${targetUser.isDisabled ? 'disabled' : 'enabled'}`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isDisabled: targetUser.isDisabled
      }
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    return res.status(500).json({ message: 'Failed to toggle user status', error: error.message });
  }
};

// @desc    Update user role (promote/demote user between 'user' and 'admin')
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: "Role must be 'user' or 'admin'" });
    }

    if (req.params.id === req.user._id.toString() && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot demote your own admin account' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    targetUser.role = role;
    await targetUser.save();

    return res.status(200).json({
      message: `User role updated to '${role}'`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ message: 'Failed to update user role', error: error.message });
  }
};

// @desc    Delete user account and associated data
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteAdminUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }

    const targetUser = await User.findByIdAndDelete(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Cleanup user's history, likes, feedback, moods, sessions
    await Promise.all([
      ListeningHistory.deleteMany({ userId: req.params.id }),
      MoodHistory.deleteMany({ userId: req.params.id }),
      Like.deleteMany({ userId: req.params.id }),
      Feedback.deleteMany({ userId: req.params.id }),
      Session.deleteMany({ userId: req.params.id })
    ]);

    return res.status(200).json({
      message: 'User account and associated data deleted successfully',
      deletedId: req.params.id
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

// @desc    Get platform-wide system analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getAdminAnalytics = async (req, res) => {
  try {
    const [
      totalUsers,
      totalSongs,
      mostPlayedSongs,
      mostLikedSongs,
      mostSkippedSongs,
      moodCounts
    ] = await Promise.all([
      User.countDocuments(),
      Song.countDocuments(),

      // Most Played Songs (Platform-wide)
      ListeningHistory.aggregate([
        { $group: { _id: '$songId', playCount: { $sum: 1 }, totalDuration: { $sum: '$listeningDuration' } } },
        { $sort: { playCount: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'songs', localField: '_id', foreignField: '_id', as: 'song' } },
        { $unwind: '$song' },
        {
          $project: {
            _id: '$song._id',
            title: '$song.title',
            artist: '$song.artist',
            genre: '$song.genre',
            mood: '$song.mood',
            playCount: 1,
            totalDuration: 1
          }
        }
      ]),

      // Most Liked Songs (Platform-wide)
      Like.aggregate([
        { $group: { _id: '$songId', likeCount: { $sum: 1 } } },
        { $sort: { likeCount: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'songs', localField: '_id', foreignField: '_id', as: 'song' } },
        { $unwind: '$song' },
        {
          $project: {
            _id: '$song._id',
            title: '$song.title',
            artist: '$song.artist',
            genre: '$song.genre',
            likeCount: 1
          }
        }
      ]),

      // Most Skipped Songs (Platform-wide)
      Feedback.aggregate([
        { $match: { action: 'skip' } },
        { $group: { _id: '$songId', skipCount: { $sum: 1 } } },
        { $sort: { skipCount: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'songs', localField: '_id', foreignField: '_id', as: 'song' } },
        { $unwind: '$song' },
        {
          $project: {
            _id: '$song._id',
            title: '$song.title',
            artist: '$song.artist',
            genre: '$song.genre',
            skipCount: 1
          }
        }
      ]),

      // Platform Mood Distribution
      MoodHistory.aggregate([
        { $group: { _id: '$dominantEmotion', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    const totalMoodScans = moodCounts.reduce((acc, curr) => acc + curr.count, 0);
    const moodDistribution = moodCounts.map((m) => ({
      mood: m._id,
      count: m.count,
      percentage: totalMoodScans > 0 ? Math.round((m.count / totalMoodScans) * 100) : 0
    }));

    return res.status(200).json({
      message: 'Admin platform analytics fetched successfully',
      analytics: {
        totalUsers,
        totalSongs,
        mostPlayedSongs,
        mostLikedSongs,
        mostSkippedSongs,
        moodDistribution,
        totalMoodScans
      }
    });
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    return res.status(500).json({ message: 'Failed to fetch platform analytics', error: error.message });
  }
};

module.exports = {
  getAdminOverview,
  getAdminSongs,
  uploadAdminSong,
  updateAdminSong,
  deleteAdminSong,
  getAdminUsers,
  getUserStats,
  toggleUserStatus,
  updateUserRole,
  deleteAdminUser,
  getAdminAnalytics
};
