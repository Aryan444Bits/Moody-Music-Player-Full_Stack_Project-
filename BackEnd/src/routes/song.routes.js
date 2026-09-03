const express = require("express");
const multer = require('multer');
const router = express.Router();
const { optionalProtect, protect } = require("../middleware/auth.middleware");
const { uploadSong, getSongs, getSongById, updateSong } = require("../controllers/song.controller");

const upload = multer({ storage: multer.memoryStorage() });

// @route   POST /songs
router.post("/songs", optionalProtect, upload.single("audio"), uploadSong);

// @route   GET /songs
router.get("/songs", optionalProtect, getSongs);

// @route   GET /songs/:id
router.get("/songs/:id", getSongById);

// @route   PUT /songs/:id
router.put("/songs/:id", protect, updateSong);

module.exports = router;