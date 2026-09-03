const uploadFile = require("../service/storage.service");
const songModel = require("../models/song.model");
const { getRecommendations } = require("../service/recommendation.service");

// Helper to parse tags safely
const parseTags = (tagsInput) => {
  if (!tagsInput) return [];
  if (Array.isArray(tagsInput)) {
    return tagsInput.map(t => String(t).trim()).filter(Boolean);
  }
  if (typeof tagsInput === 'string') {
    return tagsInput.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
};

// Helper to parse energy level (0-100)
const parseEnergy = (energyInput) => {
  const val = Number(energyInput);
  if (isNaN(val)) return 50;
  return Math.min(100, Math.max(0, val));
};

// @desc    Upload a new song with metadata (Audio stored via ImageKit)
// @route   POST /songs
const uploadSong = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Audio file is required" });
    }

    if (!req.body.title || !req.body.artist) {
      return res.status(400).json({ message: "Title and Artist are required" });
    }

    // Upload audio file to ImageKit
    const fileData = await uploadFile(req.file);

    const songData = {
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
      createdBy: req.user ? req.user._id : null
    };

    const song = await songModel.create(songData);

    return res.status(201).json({
      message: "Song Created Successfully",
      song
    });
  } catch (error) {
    console.error("Error creating song:", error);
    return res.status(500).json({
      message: "Failed to upload song",
      error: error.message
    });
  }
};

// @desc    Fetch songs with optional filtering by mood (uses recommendation engine), genre, language, or search query
// @route   GET /songs
const getSongs = async (req, res) => {
  try {
    const { mood, genre, language, search } = req.query;

    // If mood is provided, route through deterministic recommendation engine!
    if (mood) {
      const userId = req.user ? req.user._id : null;
      const recommendedSongs = await getRecommendations({ userId, mood });
      return res.status(200).json({
        message: "Songs Fetched Successfully",
        songs: recommendedSongs
      });
    }

    const filter = {};
    if (genre) {
      filter.genre = { $regex: new RegExp(genre.trim(), 'i') };
    }
    if (language) {
      filter.language = { $regex: new RegExp(language.trim(), 'i') };
    }
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { artist: searchRegex },
        { tags: searchRegex }
      ];
    }

    const songs = await songModel.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Songs Fetched Successfully",
      songs
    });
  } catch (error) {
    console.error("Error fetching songs:", error);
    return res.status(500).json({
      message: "Failed to fetch songs",
      error: error.message
    });
  }
};

// @desc    Fetch a single song by ID
// @route   GET /songs/:id
const getSongById = async (req, res) => {
  try {
    const song = await songModel.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }
    return res.status(200).json({ message: "Song fetched successfully", song });
  } catch (error) {
    console.error("Error fetching song:", error);
    return res.status(500).json({ message: "Failed to fetch song", error: error.message });
  }
};

// @desc    Update metadata for an existing song
// @route   PUT /songs/:id
const updateSong = async (req, res) => {
  try {
    const song = await songModel.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: "Song not found" });
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
      message: "Song Metadata Updated Successfully",
      song
    });
  } catch (error) {
    console.error("Error updating song metadata:", error);
    return res.status(500).json({
      message: "Failed to update song metadata",
      error: error.message
    });
  }
};

module.exports = {
  uploadSong,
  getSongs,
  getSongById,
  updateSong
};
