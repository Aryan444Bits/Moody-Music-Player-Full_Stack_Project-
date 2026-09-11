import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import MoodSongs from './MoodSongs';
import './AIMusicAssistant.css';

const API_BASE_URL = 'http://localhost:3000';

const EXAMPLE_PROMPTS = [
  "I'm stressed and want something calming.",
  "Give me energetic Hindi songs.",
  "I want music for studying.",
  "Play something positive but not too energetic."
];

const AIMusicAssistant = () => {
  const { token } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interpretedPreferences, setInterpretedPreferences] = useState(null);
  const [songs, setSongs] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (promptToUse) => {
    const textToSubmit = (promptToUse || query).trim();
    if (!textToSubmit) return;

    setLoading(true);
    setError(null);
    setQuery(textToSubmit);

    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.post(
        `${API_BASE_URL}/api/ai/music-query`,
        { query: textToSubmit },
        config
      );

      if (response.data && response.data.success) {
        setInterpretedPreferences(response.data.interpretedPreferences);
        setSongs(response.data.songs || []);
        setHasSearched(true);
      } else {
        setError(response.data.message || 'Failed to interpret request');
      }
    } catch (err) {
      console.error('Error in AI Music Assistant:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to communicate with AI Assistant';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <motion.div
      className="ai-assistant-container"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="ai-header">
        <div className="ai-title-wrapper">
          <span className="ai-icon">🤖</span>
          <div>
            <h2>AI Music Assistant</h2>
            <p className="ai-subtitle">
              Describe your mood, activity, or music vibe in natural language and let OpenRouter find real songs for you.
            </p>
          </div>
        </div>
      </div>

      {/* Natural Language Input Form */}
      <div className="ai-input-card">
        <div className="input-row">
          <textarea
            className="ai-textarea"
            placeholder="e.g. 'I'm feeling relaxed and want soothing Hindi lo-fi music for studying...'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={loading}
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSearch()}
            className="ai-submit-btn"
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <span className="btn-spinner-content">
                <span className="mini-spinner" /> Interpreting...
              </span>
            ) : (
              <span>✨ Ask AI</span>
            )}
          </motion.button>
        </div>

        {/* Quick Example Prompt Pills */}
        <div className="prompt-suggestions">
          <span className="suggestion-label">💡 Try asking:</span>
          <div className="pill-group">
            {EXAMPLE_PROMPTS.map((promptText, idx) => (
              <button
                key={idx}
                className="suggestion-pill"
                onClick={() => handleSearch(promptText)}
                disabled={loading}
              >
                "{promptText}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Alert Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="ai-error-alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className="error-icon">⚠️</span>
            <div className="error-text">
              <strong>Connection Error</strong>
              <p>{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interpreted Preferences Display Card */}
      <AnimatePresence>
        {interpretedPreferences && !loading && (
          <motion.div
            className="interpreted-preferences-card"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="preferences-header">
              <span className="pref-badge">✨ AI Preference Analysis</span>
              <p className="query-quote">"{query}"</p>
            </div>

            <div className="preferences-grid">
              {interpretedPreferences.mood && (
                <div className="pref-item">
                  <span className="pref-label">🎭 Mood</span>
                  <span className="pref-value mood-val">{interpretedPreferences.mood}</span>
                </div>
              )}

              {interpretedPreferences.energy !== null && interpretedPreferences.energy !== undefined && (
                <div className="pref-item">
                  <span className="pref-label">⚡ Target Energy</span>
                  <span className="pref-value energy-val">{interpretedPreferences.energy}%</span>
                </div>
              )}

              {interpretedPreferences.language && (
                <div className="pref-item">
                  <span className="pref-label">🌐 Language</span>
                  <span className="pref-value lang-val">{interpretedPreferences.language}</span>
                </div>
              )}

              {interpretedPreferences.genre && (
                <div className="pref-item">
                  <span className="pref-label">🎵 Genre</span>
                  <span className="pref-value genre-val">{interpretedPreferences.genre}</span>
                </div>
              )}

              {interpretedPreferences.activity && (
                <div className="pref-item">
                  <span className="pref-label">🎯 Activity</span>
                  <span className="pref-value activity-val">{interpretedPreferences.activity}</span>
                </div>
              )}
            </div>

            {Array.isArray(interpretedPreferences.tags) && interpretedPreferences.tags.length > 0 && (
              <div className="pref-tags-row">
                <span className="tags-label">🏷️ Extracted Tags:</span>
                <div className="tags-list">
                  {interpretedPreferences.tags.map((tag, i) => (
                    <span key={i} className="ai-tag-pill">#{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recommended Songs Results */}
      {hasSearched && (
        <div className="results-section">
          <MoodSongs
            Songs={songs}
            loading={loading}
            mood={interpretedPreferences?.mood || 'AI Curated'}
          />
        </div>
      )}
    </motion.div>
  );
};

export default AIMusicAssistant;
