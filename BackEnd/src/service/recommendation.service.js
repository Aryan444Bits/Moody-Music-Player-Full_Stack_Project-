const Song = require('../models/song.model');
const Like = require('../models/like.model');
const ListeningHistory = require('../models/history.model');
const Feedback = require('../models/feedback.model');

/**
 * Deterministic Recommendation Engine
 * Calculates explainable scores based on mood, user behavior (likes, replays, skips, history),
 * and song metadata (genre, language, energy, tags).
 */
const getRecommendations = async ({ userId, mood }) => {
  // Normalize detected mood
  const detectedMood = mood ? mood.trim().toLowerCase() : null;

  // Retrieve all candidate songs from DB
  const songs = await Song.find({});
  if (!songs || songs.length === 0) {
    return [];
  }

  // If no user is logged in (Cold Start / Guest User)
  if (!userId) {
    return scoreNewUserSongs(songs, detectedMood);
  }

  // Experienced User: Fetch user behavioral telemetry in parallel
  const [userLikes, userHistory, userFeedback] = await Promise.all([
    Like.find({ userId }).populate('songId'),
    ListeningHistory.find({ userId }).populate('songId').sort({ createdAt: -1 }).limit(50),
    Feedback.find({ userId })
  ]);

  // Process behavioral sets
  const likedSongIds = new Set();
  const likedGenres = new Map();
  const likedArtists = new Set();
  const likedTags = new Set();

  userLikes.forEach((like) => {
    if (like.songId) {
      const s = like.songId;
      likedSongIds.add(s._id.toString());
      if (s.artist) likedArtists.add(s.artist.toLowerCase());
      if (s.genre && s.genre !== 'Unknown') {
        likedGenres.set(s.genre.toLowerCase(), (likedGenres.get(s.genre.toLowerCase()) || 0) + 1);
      }
      if (Array.isArray(s.tags)) {
        s.tags.forEach(t => likedTags.add(t.toLowerCase()));
      }
    }
  });

  // Skips & Replays
  const skippedSongIds = new Set();
  const replayedSongIds = new Set();

  userFeedback.forEach((item) => {
    const sId = item.songId ? item.songId.toString() : null;
    if (sId) {
      if (item.action === 'skip') skippedSongIds.add(sId);
      if (item.action === 'replay') replayedSongIds.add(sId);
    }
  });

  // Recently played (last 2 hours)
  const recentlyPlayedSongIds = new Set();
  const recentCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);

  userHistory.forEach((h) => {
    if (h.songId) {
      if (h.createdAt >= recentCutoff) {
        recentlyPlayedSongIds.add(h.songId._id.toString());
      }
      if (h.songId.genre && h.songId.genre !== 'Unknown') {
        const g = h.songId.genre.toLowerCase();
        likedGenres.set(g, (likedGenres.get(g) || 0) + 1);
      }
    }
  });

  // Target Energy calculation based on detected mood
  const targetEnergyMap = {
    happy: 75,
    energetic: 85,
    angry: 70,
    surprised: 65,
    neutral: 50,
    chill: 40,
    relaxed: 30,
    sad: 25
  };
  const targetEnergy = targetEnergyMap[detectedMood] || 50;

  // Score candidates
  const scoredSongs = songs.map((songDoc) => {
    const song = songDoc.toJSON ? songDoc.toJSON() : songDoc;
    const songIdStr = song._id.toString();
    let score = 20; // Base score
    const reasons = [];

    // 1. Mood Match (+40)
    if (detectedMood && song.mood && song.mood.toLowerCase() === detectedMood) {
      score += 40;
      reasons.push(`Matches current mood (${song.mood})`);
    } else if (detectedMood && isCompatibleMood(song.mood, detectedMood)) {
      score += 20;
      reasons.push(`Complements current mood (${song.mood})`);
    }

    // 2. Liked Song (+30) or Liked Artist (+15) or Liked Genre (+15)
    if (likedSongIds.has(songIdStr)) {
      score += 30;
      reasons.push('In your Liked Songs list');
    } else {
      if (song.artist && likedArtists.has(song.artist.toLowerCase())) {
        score += 15;
        reasons.push(`By an artist you like (${song.artist})`);
      }
      if (song.genre && likedGenres.has(song.genre.toLowerCase())) {
        score += 15;
        reasons.push(`Matches preferred genre (${song.genre})`);
      }
    }

    // 3. Replay History (+20)
    if (replayedSongIds.has(songIdStr)) {
      score += 20;
      reasons.push('Frequently replayed by you');
    }

    // 4. Energy Alignment (+10)
    const energyDiff = Math.abs((song.energy !== undefined ? song.energy : 50) - targetEnergy);
    if (energyDiff <= 20) {
      score += 10;
      reasons.push(`Matches target energy level (${song.energy}%)`);
    }

    // 5. Tag Overlap (+10)
    if (Array.isArray(song.tags) && song.tags.some(t => likedTags.has(t.toLowerCase()))) {
      score += 10;
      reasons.push('Matches tags from your favorite music');
    }

    // 6. Penalties: Recent Skip (-35)
    if (skippedSongIds.has(songIdStr)) {
      score -= 35;
      reasons.push('Previously skipped by you');
    }

    // 7. Penalties: Recently Played (-15)
    if (recentlyPlayedSongIds.has(songIdStr)) {
      score -= 15;
      reasons.push('Recently played');
    }

    if (reasons.length === 0) {
      reasons.push('Curated candidate for your playlist');
    }

    const finalScore = Math.min(100, Math.max(0, score));

    return {
      ...song,
      recommendationScore: finalScore,
      reasons
    };
  });

  scoredSongs.sort((a, b) => b.recommendationScore - a.recommendationScore);
  return scoredSongs;
};

/**
 * Fallback scoring for new or unauthenticated users (Cold Start)
 */
const scoreNewUserSongs = (songs, detectedMood) => {
  const targetEnergyMap = {
    happy: 75,
    energetic: 85,
    angry: 70,
    surprised: 65,
    neutral: 50,
    chill: 40,
    relaxed: 30,
    sad: 25
  };
  const targetEnergy = targetEnergyMap[detectedMood] || 50;

  const scored = songs.map((songDoc) => {
    const song = songDoc.toJSON ? songDoc.toJSON() : songDoc;
    let score = 30; // Cold start base score
    const reasons = [];

    if (detectedMood && song.mood && song.mood.toLowerCase() === detectedMood) {
      score += 45;
      reasons.push(`Matches current detected mood (${song.mood})`);
    } else if (detectedMood && isCompatibleMood(song.mood, detectedMood)) {
      score += 25;
      reasons.push(`Complements current mood (${song.mood})`);
    }

    const energyDiff = Math.abs((song.energy !== undefined ? song.energy : 50) - targetEnergy);
    if (energyDiff <= 20) {
      score += 15;
      reasons.push(`Optimal energy level (${song.energy}%)`);
    }

    if (song.genre && song.genre !== 'Unknown') {
      score += 10;
      reasons.push(`Popular ${song.genre} selection`);
    }

    if (reasons.length === 0) {
      reasons.push('General recommended track');
    }

    const finalScore = Math.min(100, Math.max(0, score));

    return {
      ...song,
      recommendationScore: finalScore,
      reasons
    };
  });

  scored.sort((a, b) => b.recommendationScore - a.recommendationScore);
  return scored;
};

const isCompatibleMood = (songMood, detectedMood) => {
  if (!songMood || !detectedMood) return false;
  const s = songMood.toLowerCase();
  const d = detectedMood.toLowerCase();

  const pairs = {
    happy: ['energetic', 'chill', 'neutral'],
    sad: ['relaxed', 'neutral'],
    angry: ['energetic', 'neutral'],
    surprised: ['happy', 'energetic'],
    relaxed: ['sad', 'neutral', 'chill'],
    energetic: ['happy', 'surprised']
  };

  return pairs[d] ? pairs[d].includes(s) : false;
};

/**
 * Recommendation scoring based on AI-extracted preferences (mood, energy, genre, language, activity, tags)
 * combined with deterministic MongoDB candidate search and user historical telemetry.
 */
const getRecommendationsFromPreferences = async ({ userId, preferences }) => {
  const songs = await Song.find({});
  if (!songs || songs.length === 0) {
    return [];
  }

  // Fetch behavioral telemetry if user is logged in
  let likedSongIds = new Set();
  let replayedSongIds = new Set();
  let skippedSongIds = new Set();

  if (userId) {
    const [userLikes, userFeedback] = await Promise.all([
      Like.find({ userId }),
      Feedback.find({ userId })
    ]);

    userLikes.forEach((l) => {
      if (l.songId) likedSongIds.add(l.songId.toString());
    });

    userFeedback.forEach((f) => {
      if (f.songId) {
        const sid = f.songId.toString();
        if (f.action === 'skip') skippedSongIds.add(sid);
        if (f.action === 'replay') replayedSongIds.add(sid);
      }
    });
  }

  const { mood, energy, genre, language, activity, tags = [] } = preferences || {};

  const scoredSongs = songs.map((songDoc) => {
    const song = songDoc.toJSON ? songDoc.toJSON() : songDoc;
    const songIdStr = song._id.toString();
    let score = 25; // Base score
    const reasons = [];

    // 1. Language Match (+30)
    if (language && song.language) {
      if (song.language.toLowerCase() === language.toLowerCase()) {
        score += 30;
        reasons.push(`Matches preferred language (${song.language})`);
      }
    }

    // 2. Mood Match (+25) or Compatible (+15)
    if (mood && song.mood) {
      const sMood = song.mood.toLowerCase();
      const pMood = mood.toLowerCase();
      if (sMood === pMood) {
        score += 25;
        reasons.push(`Matches requested mood (${song.mood})`);
      } else if (isCompatibleMood(sMood, pMood)) {
        score += 15;
        reasons.push(`Complements requested mood (${song.mood})`);
      }
    }

    // 3. Genre Match (+20)
    if (genre && song.genre) {
      if (song.genre.toLowerCase() === genre.toLowerCase()) {
        score += 20;
        reasons.push(`Matches genre (${song.genre})`);
      }
    }

    // 4. Energy Level Alignment (+15)
    if (energy !== null && energy !== undefined && song.energy !== undefined) {
      const diff = Math.abs(song.energy - energy);
      if (diff <= 15) {
        score += 15;
        reasons.push(`Target energy level (${song.energy}%)`);
      } else if (diff <= 30) {
        score += 8;
        reasons.push(`Close energy level (${song.energy}%)`);
      }
    }

    // 5. Activity & Keyword Tag Overlap (+15)
    const combinedSearchText = `${song.title || ''} ${song.artist || ''} ${song.genre || ''} ${(song.tags || []).join(' ')}`.toLowerCase();
    
    let tagMatched = false;
    if (activity && combinedSearchText.includes(activity.toLowerCase())) {
      score += 15;
      reasons.push(`Matches activity context (${activity})`);
      tagMatched = true;
    }

    if (Array.isArray(tags) && tags.length > 0) {
      const matchingTags = tags.filter(t => combinedSearchText.includes(t.toLowerCase()));
      if (matchingTags.length > 0) {
        if (!tagMatched) score += 15;
        reasons.push(`Matches keywords (${matchingTags.slice(0, 2).join(', ')})`);
      }
    }

    // 6. User Behavioral Bonuses & Penalties
    if (likedSongIds.has(songIdStr)) {
      score += 15;
      reasons.push('In your Liked Songs');
    }
    if (replayedSongIds.has(songIdStr)) {
      score += 10;
      reasons.push('Frequently replayed');
    }
    if (skippedSongIds.has(songIdStr)) {
      score -= 25;
      reasons.push('Previously skipped');
    }

    if (reasons.length === 0) {
      reasons.push('Curated track matching your query');
    }

    const finalScore = Math.min(100, Math.max(0, score));

    return {
      ...song,
      recommendationScore: finalScore,
      reasons
    };
  });

  scoredSongs.sort((a, b) => b.recommendationScore - a.recommendationScore);
  return scoredSongs;
};

module.exports = {
  getRecommendations,
  getRecommendationsFromPreferences
};
