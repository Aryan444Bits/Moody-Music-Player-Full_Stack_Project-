const { getRecommendations } = require('../service/recommendation.service');

// @desc    Get deterministic personalized song recommendations
// @route   GET /api/recommendations
const getRecommendationsController = async (req, res) => {
  try {
    const { mood } = req.query;
    const userId = req.user ? req.user._id : null;

    const songs = await getRecommendations({ userId, mood });

    return res.status(200).json({
      message: 'Recommendations generated successfully',
      songs
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return res.status(500).json({
      message: 'Failed to generate recommendations',
      error: error.message
    });
  }
};

module.exports = {
  getRecommendationsController
};
