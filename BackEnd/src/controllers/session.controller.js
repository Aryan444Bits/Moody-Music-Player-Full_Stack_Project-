const mongoose = require('mongoose');
const Session = require('../models/session.model');
const MoodHistory = require('../models/moodHistory.model');
const ListeningHistory = require('../models/history.model');

// @desc    Start a new listening session
// @route   POST /api/sessions/start
// @access  Private
const startSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const sid = sessionId || 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();

    // Check if session already exists for user
    let session = await Session.findOne({ sessionId: sid, userId: req.user._id });

    if (!session) {
      session = await Session.create({
        userId: req.user._id,
        sessionId: sid,
        startedAt: new Date(),
        status: 'active'
      });
    }

    return res.status(201).json({
      message: 'Session started successfully',
      session
    });
  } catch (error) {
    console.error('Error starting session:', error);
    return res.status(500).json({
      message: 'Failed to start session',
      error: error.message
    });
  }
};

// @desc    End active listening session
// @route   POST /api/sessions/end or POST /api/sessions/:sessionId/end
// @access  Private
const endSession = async (req, res) => {
  try {
    const targetSessionId = req.body.sessionId || req.params.sessionId || req.params.id;

    let query = { userId: req.user._id };
    if (targetSessionId) {
      query.$or = [{ sessionId: targetSessionId }, { _id: targetSessionId }];
    } else {
      query.status = 'active';
    }

    let session = await Session.findOne(query).sort({ startedAt: -1 });

    if (!session) {
      return res.status(404).json({ message: 'No active session found to end' });
    }

    // Fetch mood records for this session to determine initial & final mood
    const moods = await MoodHistory.find({
      userId: req.user._id,
      sessionId: session.sessionId
    }).sort({ timestamp: 1 });

    const initialMood = moods.length > 0 ? moods[0].dominantEmotion : null;
    const finalMood = moods.length > 0 ? moods[moods.length - 1].dominantEmotion : null;

    session.endedAt = new Date();
    session.status = 'completed';
    if (initialMood) session.initialMood = initialMood;
    if (finalMood) session.finalMood = finalMood;
    await session.save();

    return res.status(200).json({
      message: 'Session ended successfully',
      session
    });
  } catch (error) {
    console.error('Error ending session:', error);
    return res.status(500).json({
      message: 'Failed to end session',
      error: error.message
    });
  }
};

// @desc    Get detailed Mood Journey for a specific session
// @route   GET /api/sessions/:id
// @access  Private
const getSession = async (req, res) => {
  try {
    const { id } = req.params;

    // Search by ObjectId _id or string sessionId
    let session = await Session.findOne({
      userId: req.user._id,
      $or: [{ sessionId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });

    // If session model doesn't exist yet, but mood/listening history exists for this sessionId, construct virtual session
    const sid = session ? session.sessionId : id;

    const moodDetections = await MoodHistory.find({
      userId: req.user._id,
      sessionId: sid
    }).sort({ timestamp: 1 });

    const songsPlayed = await ListeningHistory.find({
      userId: req.user._id,
      sessionId: sid
    }).populate('songId').sort({ startedAt: 1 });

    if (!session && moodDetections.length === 0 && songsPlayed.length === 0) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Construct timeline events combining moods and songs chronologically
    const moodEvents = moodDetections.map((m) => {
      const dominant = m.dominantEmotion;
      const confidence = m.emotionProbabilities && m.emotionProbabilities[dominant]
        ? m.emotionProbabilities[dominant]
        : 1.0;

      return {
        type: 'mood',
        id: m._id,
        timestamp: m.timestamp || m.createdAt,
        dominantEmotion: dominant,
        confidence,
        emotionProbabilities: m.emotionProbabilities,
        sessionId: sid
      };
    });

    const songEvents = songsPlayed.map((s) => ({
      type: 'song',
      id: s._id,
      timestamp: s.startedAt || s.createdAt,
      completedAt: s.completedAt,
      duration: s.listeningDuration,
      song: s.songId,
      detectedMood: s.detectedMood,
      sessionId: sid
    }));

    const timeline = [...moodEvents, ...songEvents].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Mood transitions list (e.g. Sad 72% -> Neutral 61% -> Happy 68%)
    const moodTransitions = moodEvents.map((m) => ({
      emotion: m.dominantEmotion,
      confidence: m.confidence,
      percentage: Math.round(m.confidence * 100),
      timestamp: m.timestamp
    }));

    const initialMood = moodTransitions.length > 0 ? moodTransitions[0] : null;
    const finalMood = moodTransitions.length > 0 ? moodTransitions[moodTransitions.length - 1] : null;

    const startTime = session ? session.startedAt : (timeline.length > 0 ? timeline[0].timestamp : new Date());
    const endTime = session?.endedAt || (timeline.length > 0 ? timeline[timeline.length - 1].timestamp : new Date());

    return res.status(200).json({
      message: 'Session journey fetched successfully',
      session: session || {
        sessionId: sid,
        userId: req.user._id,
        startedAt: startTime,
        endedAt: endTime,
        status: 'completed'
      },
      journey: {
        initialMood,
        finalMood,
        moodTransitions,
        songsPlayed: songsPlayed.map((s) => s.songId).filter(Boolean),
        timeline,
        stats: {
          totalDetections: moodDetections.length,
          totalSongsPlayed: songsPlayed.length,
          durationSeconds: Math.round((new Date(endTime) - new Date(startTime)) / 1000)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching session journey:', error);
    return res.status(500).json({
      message: 'Failed to fetch session journey',
      error: error.message
    });
  }
};

// @desc    Get recent sessions for current user
// @route   GET /api/sessions
// @access  Private
const getRecentSessions = async (req, res) => {
  try {
    let sessions = await Session.find({ userId: req.user._id }).sort({ startedAt: -1 }).lean();

    // Find distinct sessionIds from MoodHistory and ListeningHistory in case sessions were created implicitly
    const moodSessionIds = await MoodHistory.distinct('sessionId', { userId: req.user._id });
    const listeningSessionIds = await ListeningHistory.distinct('sessionId', { userId: req.user._id });

    const allSessionIds = Array.from(
      new Set([
        ...sessions.map((s) => s.sessionId),
        ...moodSessionIds.filter(Boolean),
        ...listeningSessionIds.filter(Boolean)
      ])
    );

    // Populate summary for each session
    const detailedSessions = await Promise.all(
      allSessionIds.map(async (sid) => {
        let session = sessions.find((s) => s.sessionId === sid);

        const moods = await MoodHistory.find({ userId: req.user._id, sessionId: sid })
          .sort({ timestamp: 1 })
          .select('dominantEmotion timestamp emotionProbabilities');

        const songsCount = await ListeningHistory.countDocuments({ userId: req.user._id, sessionId: sid });

        const firstMood = moods[0];
        const lastMood = moods[moods.length - 1];

        const startedAt = session?.startedAt || (firstMood ? firstMood.timestamp : new Date());
        const endedAt = session?.endedAt || (lastMood ? lastMood.timestamp : null);

        return {
          _id: session?._id || sid,
          sessionId: sid,
          startedAt,
          endedAt,
          status: session?.status || 'completed',
          initialMood: session?.initialMood || (firstMood ? firstMood.dominantEmotion : null),
          finalMood: session?.finalMood || (lastMood ? lastMood.dominantEmotion : null),
          moodCount: moods.length,
          songCount: songsCount
        };
      })
    );

    // Sort by startedAt descending
    detailedSessions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

    return res.status(200).json({
      message: 'Recent sessions fetched successfully',
      sessions: detailedSessions
    });
  } catch (error) {
    console.error('Error fetching recent sessions:', error);
    return res.status(500).json({
      message: 'Failed to fetch recent sessions',
      error: error.message
    });
  }
};

module.exports = {
  startSession,
  endSession,
  getSession,
  getRecentSessions
};
