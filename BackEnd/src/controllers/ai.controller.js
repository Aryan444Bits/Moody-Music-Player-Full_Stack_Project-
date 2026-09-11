const Song = require('../models/song.model');
const Playlist = require('../models/playlist.model');
const { generateCompletion, extractMusicPreferences, curatePlaylistFromCandidates, suggestSongMetadata } = require('../service/ai.service');
const { getRecommendationsFromPreferences } = require('../service/recommendation.service');

/**
 * Development test controller to verify OpenRouter LLM connectivity.
 * @route   POST /api/ai/test
 * @access  Protected (Auth required, Development mode only)
 */
const testAIConnection = async (req, res) => {
  // Security Guard: Prevent public exposure of dev test endpoint in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      message: 'Not found'
    });
  }

  try {
    const testPrompt = req.body?.prompt || 'Respond with a brief, friendly confirmation that the OpenRouter API connection is active.';

    const result = await generateCompletion({
      prompt: testPrompt,
      systemPrompt: 'You are a system health check assistant. Keep answers under 30 words.'
    });

    return res.status(200).json({
      success: true,
      message: 'OpenRouter communication established successfully',
      data: result
    });
  } catch (error) {
    console.error('AI Service Connection Test Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to communicate with OpenRouter',
      error: error.message
    });
  }
};

/**
 * AI Music Assistant natural language search endpoint
 * @route   POST /api/ai/music-query
 * @access  Public / Optional Auth
 */
const processMusicQuery = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid music request query'
      });
    }

    const userId = req.user ? req.user._id : null;

    // 1. Extract structured metadata preferences via OpenRouter LLM
    const interpretedPreferences = await extractMusicPreferences(query);

    // 2. Retrieve & score real candidate tracks directly from MongoDB
    const songs = await getRecommendationsFromPreferences({
      userId,
      preferences: interpretedPreferences
    });

    return res.status(200).json({
      success: true,
      query: query.trim(),
      interpretedPreferences,
      songs
    });
  } catch (error) {
    console.error('Error processing AI music query:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process AI music query',
      error: error.message
    });
  }
};

/**
 * AI Playlist Generation endpoint
 * @route   POST /api/ai/generate-playlist
 * @access  Public / Optional Auth
 */
const generateAIPlaylist = async (req, res) => {
  try {
    const { request } = req.body;

    if (!request || typeof request !== 'string' || request.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid playlist request prompt'
      });
    }

    // 1. Fetch real candidate songs from MongoDB
    const candidateSongs = await Song.find({});

    if (!candidateSongs || candidateSongs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No candidate songs found in database to generate playlist'
      });
    }

    // 2. Map candidate songs to lightweight metadata array
    const candidateMetadata = candidateSongs.map((s) => {
      const sObj = s.toJSON ? s.toJSON() : s;
      return {
        id: sObj._id.toString(),
        title: sObj.title,
        artist: sObj.artist,
        mood: sObj.mood,
        genre: sObj.genre,
        language: sObj.language,
        energy: sObj.energy,
        tags: sObj.tags
      };
    });

    // Create lookup map of valid candidate IDs
    const candidateMap = new Map(candidateSongs.map((s) => {
      const sObj = s.toJSON ? s.toJSON() : s;
      return [sObj._id.toString(), sObj];
    }));

    // 3. Send candidate metadata list to OpenRouter LLM for selection & ordering
    const curationResult = await curatePlaylistFromCandidates({
      request: request.trim(),
      candidates: candidateMetadata
    });

    // 4. STRICT BACKEND ID VALIDATION
    // Verify every songId returned by the LLM. Reject IDs that were not part of candidate set!
    const verifiedSongs = [];
    const seenIds = new Set();

    if (Array.isArray(curationResult.songIds)) {
      curationResult.songIds.forEach((id) => {
        const cleanId = String(id).trim();
        if (candidateMap.has(cleanId) && !seenIds.has(cleanId)) {
          verifiedSongs.push(candidateMap.get(cleanId));
          seenIds.add(cleanId);
        }
      });
    }

    // Fallback: If LLM failed to return valid candidate IDs, fill using recommendation engine
    if (verifiedSongs.length === 0) {
      console.warn('LLM did not return valid candidate IDs. Falling back to deterministic recommendation engine.');
      const extractedPrefs = await extractMusicPreferences(request);
      const fallbackScored = await getRecommendationsFromPreferences({
        userId: req.user ? req.user._id : null,
        preferences: extractedPrefs
      });
      verifiedSongs.push(...fallbackScored.slice(0, 8));
    }

    return res.status(200).json({
      success: true,
      request: request.trim(),
      playlist: {
        playlistName: curationResult.playlistName || 'AI Curated Playlist',
        reason: curationResult.reason || 'Handpicked tracks matching your request',
        songs: verifiedSongs
      }
    });
  } catch (error) {
    console.error('Error generating AI playlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate AI playlist',
      error: error.message
    });
  }
};

/**
 * Save AI Curated Playlist for authenticated user
 * @route   POST /api/ai/save-playlist
 * @access  Protected (Auth required)
 */
const saveAIPlaylist = async (req, res) => {
  try {
    const { name, description, songIds } = req.body;

    if (!name || !Array.isArray(songIds) || songIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Playlist name and non-empty songIds array are required'
      });
    }

    // Verify all songIds exist in DB
    const validSongs = await Song.find({ _id: { $in: songIds } });
    if (validSongs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'None of the provided song IDs exist in database'
      });
    }

    const playlist = await Playlist.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      songs: validSongs.map(s => s._id),
      user: req.user ? req.user._id : null
    });

    const populatedPlaylist = await Playlist.findById(playlist._id).populate('songs');

    return res.status(201).json({
      success: true,
      message: 'Playlist saved successfully!',
      playlist: populatedPlaylist
    });
  } catch (error) {
    console.error('Error saving AI playlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save playlist',
      error: error.message
    });
  }
};

/**
 * AI-assisted Metadata Suggestion endpoint for song uploads
 * @route   POST /api/ai/suggest-metadata
 * @access  Protected (Auth required)
 */
const suggestMetadata = async (req, res) => {
  try {
    const { title, artist, language, description } = req.body;

    if (!title && !artist && !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least a song title, artist, or description to suggest metadata'
      });
    }

    const suggestions = await suggestSongMetadata({
      title: title ? String(title).trim() : '',
      artist: artist ? String(artist).trim() : '',
      language: language ? String(language).trim() : '',
      description: description ? String(description).trim() : ''
    });

    // Whitelist and normalize fields strictly
    const ALLOWED_MOODS = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'relaxed', 'energetic', 'chill'];
    const ALLOWED_GENRES = ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Acoustic', 'Ambient', 'Classical', 'Jazz', 'Lo-Fi', 'Indie', 'Other'];
    const ALLOWED_LANGUAGES = ['English', 'Spanish', 'Hindi', 'French', 'Japanese', 'German', 'Instrumental', 'Other'];

    const whitelistedSuggestions = {
      mood: ALLOWED_MOODS.includes(suggestions.mood) ? suggestions.mood : 'neutral',
      genre: ALLOWED_GENRES.includes(suggestions.genre) ? suggestions.genre : 'Other',
      language: ALLOWED_LANGUAGES.includes(suggestions.language) ? suggestions.language : 'English',
      energy: Math.min(100, Math.max(0, parseInt(suggestions.energy, 10) || 50)),
      tags: Array.isArray(suggestions.tags) ? suggestions.tags.slice(0, 8) : []
    };

    return res.status(200).json({
      success: true,
      suggestions: whitelistedSuggestions
    });
  } catch (error) {
    console.error('Error suggesting metadata:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate metadata suggestions',
      error: error.message
    });
  }
};

module.exports = {
  testAIConnection,
  processMusicQuery,
  generateAIPlaylist,
  saveAIPlaylist,
  suggestMetadata
};
