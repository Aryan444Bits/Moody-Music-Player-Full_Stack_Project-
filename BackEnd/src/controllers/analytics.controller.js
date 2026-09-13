const mongoose = require('mongoose');
const ListeningHistory = require('../models/history.model');
const MoodHistory = require('../models/moodHistory.model');
const Like = require('../models/like.model');
const Feedback = require('../models/feedback.model');
const Song = require('../models/song.model');
const Session = require('../models/session.model');

// @desc    Get comprehensive user analytics data
// @route   GET /api/analytics
// @access  Private
const getAnalytics = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // 1. LISTENING STATISTICS AGGREGATIONS
    const totalSongsPlayedPromise = ListeningHistory.countDocuments({ userId });

    const totalListeningTimePromise = ListeningHistory.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalSeconds: { $sum: '$listeningDuration' } } }
    ]);

    const mostPlayedSongsPromise = ListeningHistory.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$songId',
          playCount: { $sum: 1 },
          totalDuration: { $sum: '$listeningDuration' }
        }
      },
      { $sort: { playCount: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: 'songs',
          localField: '_id',
          foreignField: '_id',
          as: 'song'
        }
      },
      { $unwind: '$song' },
      {
        $project: {
          _id: '$song._id',
          title: '$song.title',
          artist: '$song.artist',
          genre: '$song.genre',
          audioUrl: { $ifNull: ['$song.audioUrl', '$song.audio'] },
          mood: '$song.mood',
          playCount: 1,
          totalDuration: 1
        }
      }
    ]);

    const recentlyPlayedPromise = ListeningHistory.find({ userId })
      .sort({ startedAt: -1, createdAt: -1 })
      .limit(6)
      .populate('songId', 'title artist genre audio audioUrl mood energy');

    const mostLikedSongsPromise = Like.aggregate([
      { $match: { userId } },
      { $sort: { createdAt: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: 'songs',
          localField: 'songId',
          foreignField: '_id',
          as: 'song'
        }
      },
      { $unwind: '$song' },
      {
        $project: {
          _id: '$song._id',
          title: '$song.title',
          artist: '$song.artist',
          genre: '$song.genre',
          audioUrl: { $ifNull: ['$song.audioUrl', '$song.audio'] },
          mood: '$song.mood',
          likedAt: '$createdAt'
        }
      }
    ]);

    const mostSkippedSongsPromise = Feedback.aggregate([
      { $match: { userId, action: 'skip' } },
      { $group: { _id: '$songId', skipCount: { $sum: 1 } } },
      { $sort: { skipCount: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: 'songs',
          localField: '_id',
          foreignField: '_id',
          as: 'song'
        }
      },
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
    ]);

    const mostReplayedSongsPromise = Feedback.aggregate([
      { $match: { userId, action: 'replay' } },
      { $group: { _id: '$songId', replayCount: { $sum: 1 } } },
      { $sort: { replayCount: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: 'songs',
          localField: '_id',
          foreignField: '_id',
          as: 'song'
        }
      },
      { $unwind: '$song' },
      {
        $project: {
          _id: '$song._id',
          title: '$song.title',
          artist: '$song.artist',
          genre: '$song.genre',
          replayCount: 1
        }
      }
    ]);

    // 2. MUSIC PREFERENCES AGGREGATIONS
    const favoriteGenresPromise = ListeningHistory.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'songs',
          localField: 'songId',
          foreignField: '_id',
          as: 'song'
        }
      },
      { $unwind: '$song' },
      {
        $group: {
          _id: '$song.genre',
          playCount: { $sum: 1 },
          totalDuration: { $sum: '$listeningDuration' }
        }
      },
      { $sort: { playCount: -1 } },
      { $limit: 5 }
    ]);

    const favoriteLanguagesPromise = ListeningHistory.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'songs',
          localField: 'songId',
          foreignField: '_id',
          as: 'song'
        }
      },
      { $unwind: '$song' },
      {
        $group: {
          _id: '$song.language',
          playCount: { $sum: 1 }
        }
      },
      { $sort: { playCount: -1 } },
      { $limit: 5 }
    ]);

    const energyStatsPromise = ListeningHistory.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'songs',
          localField: 'songId',
          foreignField: '_id',
          as: 'song'
        }
      },
      { $unwind: '$song' },
      {
        $group: {
          _id: null,
          avgEnergy: { $avg: '$song.energy' },
          minEnergy: { $min: '$song.energy' },
          maxEnergy: { $max: '$song.energy' },
          count: { $sum: 1 }
        }
      }
    ]);

    const mostPlayedArtistsPromise = ListeningHistory.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'songs',
          localField: 'songId',
          foreignField: '_id',
          as: 'song'
        }
      },
      { $unwind: '$song' },
      {
        $group: {
          _id: '$song.artist',
          playCount: { $sum: 1 },
          totalDuration: { $sum: '$listeningDuration' }
        }
      },
      { $sort: { playCount: -1 } },
      { $limit: 5 }
    ]);

    // 3. MOOD STATISTICS AGGREGATIONS
    const moodCountsPromise = MoodHistory.aggregate([
      { $match: { userId } },
      { $group: { _id: '$dominantEmotion', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const moodOverTimePromise = MoodHistory.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            dominantEmotion: '$dominantEmotion'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    const recentMoodScansPromise = MoodHistory.find({ userId })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('dominantEmotion emotionProbabilities timestamp sessionId');

    // 4. MOOD JOURNEY SESSIONS SUMMARY
    const userSessionsPromise = Session.find({ userId }).sort({ startedAt: -1 }).limit(5).lean();

    // Execute all parallel MongoDB aggregation queries
    const [
      totalSongsPlayed,
      totalListeningTimeRes,
      mostPlayedSongs,
      recentlyPlayed,
      mostLikedSongs,
      mostSkippedSongs,
      mostReplayedSongs,
      favoriteGenres,
      favoriteLanguages,
      energyStatsRes,
      mostPlayedArtists,
      moodCounts,
      moodOverTime,
      recentMoodScans,
      rawSessions
    ] = await Promise.all([
      totalSongsPlayedPromise,
      totalListeningTimePromise,
      mostPlayedSongsPromise,
      recentlyPlayedPromise,
      mostLikedSongsPromise,
      mostSkippedSongsPromise,
      mostReplayedSongsPromise,
      favoriteGenresPromise,
      favoriteLanguagesPromise,
      energyStatsPromise,
      mostPlayedArtistsPromise,
      moodCountsPromise,
      moodOverTimePromise,
      recentMoodScansPromise,
      userSessionsPromise
    ]);

    // Format stats values
    const totalListeningSeconds = totalListeningTimeRes.length > 0 ? totalListeningTimeRes[0].totalSeconds : 0;
    const energyStats = energyStatsRes.length > 0 ? energyStatsRes[0] : { avgEnergy: 50, count: 0 };

    // Determine most common mood
    const mostCommonMood = moodCounts.length > 0 ? moodCounts[0]._id : 'neutral';
    const totalMoodScans = moodCounts.reduce((acc, curr) => acc + curr.count, 0);
    const moodDistribution = moodCounts.map((m) => ({
      mood: m._id,
      count: m.count,
      percentage: totalMoodScans > 0 ? Math.round((m.count / totalMoodScans) * 100) : 0
    }));

    // Process sessions summary for Mood Journey section
    const moodSessionIds = await MoodHistory.distinct('sessionId', { userId });
    const listeningSessionIds = await ListeningHistory.distinct('sessionId', { userId });
    const allSessionIds = Array.from(
      new Set([
        ...rawSessions.map((s) => s.sessionId),
        ...moodSessionIds.filter(Boolean),
        ...listeningSessionIds.filter(Boolean)
      ])
    ).slice(0, 5);

    const recentSessionsSummary = await Promise.all(
      allSessionIds.map(async (sid) => {
        const sessionObj = rawSessions.find((s) => s.sessionId === sid);
        const moods = await MoodHistory.find({ userId, sessionId: sid })
          .sort({ timestamp: 1 })
          .select('dominantEmotion timestamp');
        const songCount = await ListeningHistory.countDocuments({ userId, sessionId: sid });
        const firstMood = moods[0]?.dominantEmotion || sessionObj?.initialMood || 'N/A';
        const lastMood = moods[moods.length - 1]?.dominantEmotion || sessionObj?.finalMood || 'N/A';
        const startedAt = sessionObj?.startedAt || (moods[0] ? moods[0].timestamp : new Date());
        const endedAt = sessionObj?.endedAt || (moods[moods.length - 1] ? moods[moods.length - 1].timestamp : null);
        const durationSeconds = endedAt && startedAt ? Math.round((new Date(endedAt) - new Date(startedAt)) / 1000) : 0;

        return {
          sessionId: sid,
          startedAt,
          endedAt,
          status: sessionObj?.status || 'completed',
          initialMood: firstMood,
          finalMood: lastMood,
          moodCount: moods.length,
          songCount,
          durationSeconds
        };
      })
    );

    return res.status(200).json({
      message: 'User analytics fetched successfully',
      listeningStats: {
        totalSongsPlayed,
        totalListeningSeconds,
        mostPlayedSongs,
        recentlyPlayed: recentlyPlayed.map((item) => ({
          _id: item._id,
          startedAt: item.startedAt,
          detectedMood: item.detectedMood,
          duration: item.listeningDuration,
          song: item.songId
        })),
        mostLikedSongs,
        mostSkippedSongs,
        mostReplayedSongs
      },
      musicPreferences: {
        favoriteGenres: favoriteGenres.map((g) => ({
          genre: g._id || 'Unknown',
          playCount: g.playCount,
          totalDuration: g.totalDuration
        })),
        favoriteLanguages: favoriteLanguages.map((l) => ({
          language: l._id || 'Unknown',
          playCount: l.playCount
        })),
        energyLevel: {
          avgEnergy: Math.round(energyStats.avgEnergy || 50),
          category:
            (energyStats.avgEnergy || 50) >= 70
              ? 'High Energy (Vibrant / Upbeat)'
              : (energyStats.avgEnergy || 50) >= 40
              ? 'Moderate Energy (Balanced / Chill)'
              : 'Relaxing / Low Energy'
        },
        mostPlayedArtists: mostPlayedArtists.map((a) => ({
          artist: a._id || 'Unknown Artist',
          playCount: a.playCount,
          totalDuration: a.totalDuration
        }))
      },
      moodStats: {
        mostCommonMood,
        totalMoodScans,
        moodDistribution,
        moodOverTime,
        recentMoodScans
      },
      moodJourneySummary: recentSessionsSummary
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return res.status(500).json({
      message: 'Failed to fetch user analytics',
      error: error.message
    });
  }
};

module.exports = {
  getAnalytics
};
