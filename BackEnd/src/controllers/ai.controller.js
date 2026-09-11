const { generateCompletion } = require('../service/ai.service');

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

module.exports = {
  testAIConnection
};
