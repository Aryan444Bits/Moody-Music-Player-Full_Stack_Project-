const express = require('express');
const router = express.Router();
const { optionalProtect } = require('../middleware/auth.middleware');
const { getRecommendationsController } = require('../controllers/recommendation.controller');

// @route   GET /api/recommendations
router.get('/', optionalProtect, getRecommendationsController);

module.exports = router;
