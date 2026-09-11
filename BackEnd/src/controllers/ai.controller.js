const { generateCompletion, extractMusicPreferences } = require('../service/ai.service');
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

module.exports = {
  testAIConnection,
  processMusicQuery
};
