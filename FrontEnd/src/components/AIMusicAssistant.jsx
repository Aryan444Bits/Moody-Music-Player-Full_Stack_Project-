import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import MoodSongs from './MoodSongs';
import './AIMusicAssistant.css';

const API_BASE_URL = 'http://localhost:3000';

const SEARCH_PROMPTS = [
  "I'm stressed and want something calming.",
  "Give me energetic Hindi songs.",
  "I want music for studying.",
  "Play something positive but not too energetic."
];

const PLAYLIST_PROMPTS = [
  "Create a late-night study playlist.",
  "Give me a relaxing playlist.",
  "Make a high-energy workout playlist."
];

const AIMusicAssistant = () => {
  const { user, token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'playlist'
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Search Mode State
  const [interpretedPreferences, setInterpretedPreferences] = useState(null);
  const [searchSongs, setSearchSongs] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Playlist Mode State
  const [generatedPlaylist, setGeneratedPlaylist] = useState(null);
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  // Handle Search Request
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
        setSearchSongs(response.data.songs || []);
        setHasSearched(true);
      } else {
        setError(response.data.message || 'Failed to interpret request');
      }
    } catch (err) {
      console.error('Error in AI Search:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to communicate with AI Assistant';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Playlist Generation Request
  const handleGeneratePlaylist = async (promptToUse) => {
    const textToSubmit = (promptToUse || query).trim();
    if (!textToSubmit) return;

    setLoading(true);
    setError(null);
    setSaveSuccessMsg(null);
    setQuery(textToSubmit);

    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.post(
        `${API_BASE_URL}/api/ai/generate-playlist`,
        { request: textToSubmit },
        config
      );

      if (response.data && response.data.success) {
        setGeneratedPlaylist(response.data.playlist);
      } else {
        setError(response.data.message || 'Failed to generate playlist');
      }
    } catch (err) {
      console.error('Error in AI Playlist Generator:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to generate AI playlist';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Save Generated Playlist
  const handleSavePlaylist = async () => {
    if (!user || !token) {
      alert('Please log in to save playlists to your account.');
      return;
    }

    if (!generatedPlaylist || !generatedPlaylist.songs || generatedPlaylist.songs.length === 0) {
      return;
    }

    setSavingPlaylist(true);
    setSaveSuccessMsg(null);

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const songIds = generatedPlaylist.songs.map((s) => s._id);

      const response = await axios.post(
        `${API_BASE_URL}/api/ai/save-playlist`,
        {
          name: generatedPlaylist.playlistName,
          description: generatedPlaylist.reason,
          songIds
        },
        config
      );

      if (response.data && response.data.success) {
        setSaveSuccessMsg('Playlist saved successfully to your library! 🎉');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Error saving playlist:', err);
      alert(err.response?.data?.message || 'Failed to save playlist');
    } finally {
      setSavingPlaylist(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeTab === 'search') handleSearch();
      else handleGeneratePlaylist();
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
            <h2>AI Music Assistant & Playlist DJ</h2>
            <p className="ai-subtitle">
              Describe your mood or request custom AI-curated playlists from real candidate songs.
            </p>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="mode-tabs">
        <button
          className={`mode-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('search');
            setError(null);
          }}
        >
          🔍 Preference Search
        </button>
        <button
          className={`mode-tab ${activeTab === 'playlist' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('playlist');
            setError(null);
          }}
        >
          🎧 Generate AI Playlist
        </button>
      </div>

      {/* Natural Language Input Card */}
      <div className="ai-input-card">
        <div className="input-row">
          <textarea
            className="ai-textarea"
            placeholder={
              activeTab === 'search'
                ? "e.g. 'I'm feeling relaxed and want soothing Hindi lo-fi music for studying...'"
                : "e.g. 'Create a late-night study playlist with soft acoustic beats...'"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={loading}
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => (activeTab === 'search' ? handleSearch() : handleGeneratePlaylist())}
            className="ai-submit-btn"
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <span className="btn-spinner-content">
                <span className="mini-spinner" />
                {activeTab === 'search' ? 'Interpreting...' : 'Curating...'}
              </span>
            ) : (
              <span>{activeTab === 'search' ? '✨ Ask AI' : '🎧 Generate Playlist'}</span>
            )}
          </motion.button>
        </div>

        {/* Quick Example Prompt Pills */}
        <div className="prompt-suggestions">
          <span className="suggestion-label">💡 Try asking:</span>
          <div className="pill-group">
            {(activeTab === 'search' ? SEARCH_PROMPTS : PLAYLIST_PROMPTS).map((promptText, idx) => (
              <button
                key={idx}
                className="suggestion-pill"
                onClick={() =>
                  activeTab === 'search'
                    ? handleSearch(promptText)
                    : handleGeneratePlaylist(promptText)
                }
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
              <strong>Request Error</strong>
              <p>{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEARCH MODE RESULTS */}
      {activeTab === 'search' && (
        <>
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

          {hasSearched && (
            <div className="results-section">
              <MoodSongs
                Songs={searchSongs}
                loading={loading}
                mood={interpretedPreferences?.mood || 'AI Curated'}
              />
            </div>
          )}
        </>
      )}

      {/* PLAYLIST MODE RESULTS */}
      {activeTab === 'playlist' && (
        <AnimatePresence>
          {generatedPlaylist && !loading && (
            <motion.div
              className="playlist-results-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Playlist Header Card */}
              <div className="playlist-header-card">
                <div className="playlist-art-wrapper">
                  <span className="vinyl-disc">💿</span>
                </div>
                <div className="playlist-meta">
                  <span className="playlist-badge">✨ AI Curated Playlist</span>
                  <h3 className="playlist-title">{generatedPlaylist.playlistName}</h3>
                  <p className="playlist-reason">{generatedPlaylist.reason}</p>

                  <div className="playlist-action-bar">
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleSavePlaylist}
                      disabled={savingPlaylist}
                      className="save-playlist-btn"
                    >
                      {savingPlaylist ? '💾 Saving...' : '💾 Save Playlist to Library'}
                    </motion.button>
                  </div>

                  {saveSuccessMsg && (
                    <motion.div
                      className="save-toast"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {saveSuccessMsg}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Playlist Tracks List */}
              <div className="playlist-tracks-wrapper">
                <MoodSongs
                  Songs={generatedPlaylist.songs || []}
                  loading={false}
                  mood={generatedPlaylist.playlistName}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default AIMusicAssistant;
