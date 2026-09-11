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

/**
 * Send real candidate song metadata to OpenRouter to select and order a playlist.
 * 
 * @param {Object} params
 * @param {string} params.request - User natural language request e.g. "Create a late-night study playlist"
 * @param {Array<Object>} params.candidates - Array of candidate song metadata objects [{ id, title, artist, mood, genre, language, energy, tags }]
 * @returns {Promise<{playlistName: string, reason: string, songIds: string[]}>}
 */
async function curatePlaylistFromCandidates({ request, candidates }) {
  if (!request || typeof request !== 'string' || request.trim().length === 0) {
    throw new Error('Playlist request string is required');
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('No candidate songs available to curate playlist from');
  }

  const systemPrompt = `You are an expert music DJ and playlist curator.
Your job is to curate an ordered playlist based on the user's natural language request using ONLY the candidate songs provided in JSON format.

CRITICAL CONSTRAINTS:
1. You MUST ONLY select song IDs from the provided candidate list.
2. DO NOT invent, hallucinate, or generate any song IDs, titles, or artists outside of the provided list.
3. Select between 3 to 10 of the best matching candidates and order them logically for smooth flow.
4. Output MUST be a single raw valid JSON object with NO markdown formatting, NO backticks, NO extra text.

Required Output Schema:
{
  "playlistName": string,  // Creative theme title, e.g. "Late Night Ambient Focus"
  "reason": string,        // Brief 1-2 sentence explanation of why these songs were curated and ordered this way
  "songIds": string[]      // Array of valid candidate song "id" values ONLY, ordered from first to last song
}`;

  const promptText = `User Request: "${request.trim()}"

Candidate Songs JSON:
${JSON.stringify(candidates)}`;

  const result = await generateCompletion({
    prompt: promptText,
    systemPrompt,
    temperature: 0.3
  });

  let rawContent = result.content.trim();

  // Strip possible markdown code block wrappers
  if (rawContent.startsWith('```')) {
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  try {
    const parsed = JSON.parse(rawContent);

    return {
      playlistName: typeof parsed.playlistName === 'string' && parsed.playlistName.trim() ? parsed.playlistName.trim() : 'AI Curated Playlist',
      reason: typeof parsed.reason === 'string' && parsed.reason.trim() ? parsed.reason.trim() : 'Curated matching your prompt',
      songIds: Array.isArray(parsed.songIds) ? parsed.songIds.map(id => String(id).trim()).filter(Boolean) : []
    };
  } catch (parseError) {
    console.warn('Failed to parse OpenRouter playlist JSON output:', rawContent);
    // Fallback: Return all candidate IDs up to 10
    return {
      playlistName: 'AI Curated Playlist',
      reason: 'Curated list matching your request',
      songIds: candidates.slice(0, 10).map(c => c.id)
    };
  }
}

/**
 * Generate metadata suggestions based purely on textual details (title, artist, language, description).
 * 
 * @param {Object} inputData
 * @param {string} inputData.title - Song title
 * @param {string} inputData.artist - Artist name
 * @param {string} [inputData.language] - Optional known language
 * @param {string} [inputData.description] - Optional user notes/description
 * @returns {Promise<{mood: string, genre: string, language: string, energy: number, tags: string[]}>}
 */
async function suggestSongMetadata({ title, artist, language, description }) {
  const systemPrompt = `You are an expert music metadata classifier.
Analyze the provided song textual details (title, artist, language, user description) and suggest accurate, standardized metadata fields.

CRITICAL CONSTRAINTS:
1. You are analyzing ONLY textual details. Do NOT claim to analyze audio files.
2. Return ONLY a single raw valid JSON object with NO markdown formatting, NO backticks, NO extra text.

Allowed Enum Options:
- mood: one of ["happy", "sad", "angry", "surprised", "neutral", "relaxed", "energetic", "chill"]
- genre: one of ["Pop", "Rock", "Hip-Hop", "R&B", "Electronic", "Acoustic", "Ambient", "Classical", "Jazz", "Lo-Fi", "Indie", "Other"]
- language: one of ["English", "Spanish", "Hindi", "French", "Japanese", "German", "Instrumental", "Other"]
- energy: integer between 0 and 100
- tags: array of 2-5 relevant keyword strings (e.g. ["study", "relaxing", "night"])

Required Output Schema:
{
  "mood": string,
  "genre": string,
  "language": string,
  "energy": number,
  "tags": string[]
}`;

  const promptText = `Song Title: "${title || ''}"
Artist: "${artist || ''}"
Language Note: "${language || ''}"
User Description / Vibe Notes: "${description || ''}"`;

  const result = await generateCompletion({
    prompt: promptText,
    systemPrompt,
    temperature: 0.3
  });

  let rawContent = result.content.trim();

  // Strip possible markdown code block wrappers
  if (rawContent.startsWith('```')) {
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  try {
    const parsed = JSON.parse(rawContent);

    return {
      mood: typeof parsed.mood === 'string' ? parsed.mood.trim().toLowerCase() : 'neutral',
      genre: typeof parsed.genre === 'string' ? parsed.genre.trim() : 'Pop',
      language: typeof parsed.language === 'string' ? parsed.language.trim() : 'English',
      energy: typeof parsed.energy === 'number' && !isNaN(parsed.energy) ? Math.min(100, Math.max(0, Math.round(parsed.energy))) : 50,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean) : []
    };
  } catch (parseError) {
    console.warn('Failed to parse OpenRouter metadata JSON output:', rawContent);
    return {
      mood: 'neutral',
      genre: 'Other',
      language: 'English',
      energy: 50,
      tags: ['music']
    };
  }
}

module.exports = {
  generateCompletion,
  extractMusicPreferences,
  curatePlaylistFromCandidates,
  suggestSongMetadata,
  DEFAULT_MODEL
};
