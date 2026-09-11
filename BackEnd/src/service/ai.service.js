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

/**
 * Extract structured music preferences from natural language query using OpenRouter.
 * 
 * @param {string} userQuery - Natural language request from user
 * @returns {Promise<{mood: string|null, energy: number|null, genre: string|null, language: string|null, activity: string|null, tags: string[]}>}
 */
async function extractMusicPreferences(userQuery) {
  if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
    throw new Error('User query string is required');
  }

  const systemPrompt = `You are an expert music metadata recommendation assistant.
Analyze the user's natural language music request and extract structured preference fields into a raw JSON object.

Output MUST be a single raw valid JSON object with NO markdown formatting, NO backticks, NO extra text.

Schema:
{
  "mood": string | null,        // e.g. "calm", "happy", "sad", "energetic", "focus", "relaxed", "neutral", "romantic", "chill", "angry"
  "energy": number | null,      // scale 0 to 100 (e.g. low=25, medium=50, high=85), or null if unspecified
  "genre": string | null,       // e.g. "Pop", "Rock", "Lo-Fi", "Classical", "Hip-Hop", "Acoustic", "Jazz", "Edm" or null
  "language": string | null,    // e.g. "Hindi", "English", "Punjabi", "Spanish" or null
  "activity": string | null,    // e.g. "study", "workout", "sleep", "party", "relax", "driving", "coding" or null
  "tags": string[]              // array of relevant keyword tags extracted from the prompt, e.g. ["relaxing", "calming"]
}

Guidelines:
- "stressed" / "calming" -> mood: "calm", energy: 25, activity: "relax", tags: ["relaxing", "calming"]
- "energetic Hindi songs" -> mood: "energetic", energy: 85, language: "Hindi", tags: ["upbeat", "energetic"]
- "music for studying" -> mood: "focus", energy: 35, activity: "study", tags: ["study", "focus"]
- "positive but not too energetic" -> mood: "happy", energy: 45, tags: ["positive", "chill"]
- If query specifies language like "Hindi", "English", set language field.
- Never output song titles or artist names. Only output metadata preference JSON.`;

  const result = await generateCompletion({
    prompt: `Extract music preferences for this request: "${userQuery.trim()}"`,
    systemPrompt,
    temperature: 0.2
  });

  let rawContent = result.content.trim();

  // Strip possible markdown code block wrappers
  if (rawContent.startsWith('```')) {
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  try {
    const parsed = JSON.parse(rawContent);

    // Validate and sanitize parsed fields
    return {
      mood: typeof parsed.mood === 'string' && parsed.mood.trim() ? parsed.mood.trim().toLowerCase() : null,
      energy: typeof parsed.energy === 'number' && !isNaN(parsed.energy) ? Math.min(100, Math.max(0, Math.round(parsed.energy))) : null,
      genre: typeof parsed.genre === 'string' && parsed.genre.trim() ? parsed.genre.trim() : null,
      language: typeof parsed.language === 'string' && parsed.language.trim() ? parsed.language.trim() : null,
      activity: typeof parsed.activity === 'string' && parsed.activity.trim() ? parsed.activity.trim().toLowerCase() : null,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean) : []
    };
  } catch (parseError) {
    console.warn('Failed to parse OpenRouter JSON preferences output:', rawContent);
    // Safe fallback preferences based on simple keyword extraction
    return {
      mood: null,
      energy: null,
      genre: null,
      language: null,
      activity: null,
      tags: userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    };
  }
}

module.exports = {
  generateCompletion,
  extractMusicPreferences,
  DEFAULT_MODEL
};
