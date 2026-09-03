const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { recordHistory, getHistory, clearHistory } = require('../controllers/history.controller');

// @route   POST /api/history
router.post('/', protect, recordHistory);

// @route   GET /api/history
router.get('/', protect, getHistory);

// @route   DELETE /api/history
router.delete('/', protect, clearHistory);

module.exports = router;
