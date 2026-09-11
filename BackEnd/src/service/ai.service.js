const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Call OpenRouter API with prompt or messages array.
 * 
 * @param {Object} options
 * @param {Array<{role: string, content: string}>} [options.messages] - Standard chat messages array
 * @param {string} [options.prompt] - Simple prompt string (converted to user message if messages not provided)
 * @param {string} [options.systemPrompt] - Optional system prompt
 * @param {string} [options.model] - Target model (defaults to google/gemini-2.5-flash)
 * @param {number} [options.temperature] - Sampling temperature (default 0.7)
 * @param {number} [options.maxTokens] - Max completion tokens
 * @param {number} [options.timeoutMs] - Request timeout in milliseconds (default 15000)
 * @returns {Promise<{content: string, model: string, usage: Object, finishReason: string}>}
 */
async function generateCompletion(options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_key') {
    throw new Error('OPENROUTER_API_KEY is not configured in environment variables');
  }

  const {
    messages: inputMessages,
    prompt,
    systemPrompt,
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens,
    timeoutMs = DEFAULT_TIMEOUT_MS
  } = options;

  // Build messages array
  let messages = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  if (Array.isArray(inputMessages) && inputMessages.length > 0) {
    messages = messages.concat(inputMessages);
  } else if (prompt && typeof prompt === 'string' && prompt.trim().length > 0) {
    messages.push({ role: 'user', content: prompt });
  } else {
    throw new Error('Either a non-empty "messages" array or a valid "prompt" string must be provided');
  }

  // Set up timeout via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requestBody = {
    model,
    messages,
    temperature
  };

  if (maxTokens) {
    requestBody.max_tokens = maxTokens;
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'Moody Music Player'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorJson = await response.json();
        errorDetails = errorJson.error?.message || errorJson.message || JSON.stringify(errorJson);
      } catch (e) {
        errorDetails = await response.text().catch(() => response.statusText);
      }

      // Sanitise error details to ensure API key is never exposed
      const sanitizedMessage = apiKey ? errorDetails.replace(new RegExp(apiKey, 'g'), '[REDACTED_API_KEY]') : errorDetails;

      throw new Error(`OpenRouter API error (${response.status}): ${sanitizedMessage}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('Received malformed or empty response choices from OpenRouter');
    }

    const choice = data.choices[0];
    const content = choice.message?.content;

    if (content === undefined || content === null) {
      throw new Error('Received malformed response: missing message content from OpenRouter');
    }

    return {
      content: content.trim(),
      model: data.model || model,
      usage: data.usage || null,
      finishReason: choice.finish_reason || 'stop'
    };

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`OpenRouter API request timed out after ${timeoutMs}ms`);
    }

    // Sanitise error message before rethrowing
    if (apiKey && error.message) {
      error.message = error.message.replace(new RegExp(apiKey, 'g'), '[REDACTED_API_KEY]');
    }

    throw error;
  }
}

module.exports = {
  generateCompletion,
  DEFAULT_MODEL
};
