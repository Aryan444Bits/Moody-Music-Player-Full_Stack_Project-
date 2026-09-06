import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './MoodHistory.css';

const API_BASE_URL = 'http://localhost:3000/api/moods';

const EMOJI_MAP = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  neutral: '😐',
  surprised: '😮',
  fearful: '😨',
  disgusted: '🤢'
};

const MoodHistory = () => {
  const { token } = useContext(AuthContext);
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const fetchMoodHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(API_BASE_URL, config);
      setMoods(res.data.moods || []);
    } catch (err) {
      console.error('Error fetching mood history:', err);
      setError('Failed to load mood history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoodHistory();
  }, [token]);

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your entire mood history?')) {
      return;
    }

    setClearing(true);
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.delete(API_BASE_URL, config);
      setMoods([]);
    } catch (err) {
      console.error('Error clearing mood history:', err);
      alert('Failed to clear mood history.');
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    setDeletingId(id);
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.delete(`${API_BASE_URL}/${id}`, config);
      setMoods((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      console.error('Error deleting mood record:', err);
      alert('Failed to delete mood record.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderProbabilities = (probs) => {
    if (!probs || typeof probs !== 'object') return null;

    // Convert object or map entries into array of { emotion, value }
    const entries = Object.entries(probs)
      .filter(([_, val]) => typeof val === 'number' && !isNaN(val))
      .map(([emotion, val]) => ({
        emotion,
        percentage: Math.round(val * 100),
        val
      }))
      .sort((a, b) => b.val - a.val);

    if (entries.length === 0) return null;

    return (
      <div className="probabilities-grid">
        {entries.map(({ emotion, percentage }) => (
          <div key={emotion} className="prob-item">
            <div className="prob-info">
              <span className="prob-label">
                {EMOJI_MAP[emotion.toLowerCase()] || ''} {emotion}
              </span>
              <span className="prob-val">{percentage}%</span>
            </div>
            <div className="prob-bar-track">
              <div
                className={`prob-bar-fill ${emotion.toLowerCase()}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      className="mood-history-wrapper"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mood-history-card">
        <div className="mood-history-header">
          <div>
            <h2>Mood <span className="span-elem">History</span></h2>
            <p className="mood-history-subtitle">
              Track facial expression detections and confidence scores over time.
            </p>
          </div>
          {moods.length > 0 && (
            <button
              onClick={handleClearHistory}
              disabled={clearing}
              className="clear-btn"
            >
              {clearing ? 'Clearing...' : 'Clear All History'}
            </button>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}

        {loading ? (
          <div className="loading-history">
            <motion.div
              className="history-loader"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            />
            <p>Loading your mood detection logs...</p>
          </div>
        ) : moods.length === 0 ? (
          <div className="empty-history">
            <p>🎭 No mood detection history recorded yet.</p>
            <span style={{ fontSize: '0.9rem', color: '#888' }}>
              Detect your mood on the Mood Suggestions page to automatically log your results!
            </span>
          </div>
        ) : (
          <div className="mood-list">
            <AnimatePresence>
              {moods.map((item, index) => {
                const dominant = item.dominantEmotion || 'neutral';
                const emoji = EMOJI_MAP[dominant.toLowerCase()] || '😐';
                const isDeleting = deletingId === item._id;

                return (
                  <motion.div
                    key={item._id || index}
                    className="mood-item-card"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <div className="mood-item-header">
                      <div className="mood-badge-group">
                        <span className={`mood-badge ${dominant.toLowerCase()}`}>
                          {emoji} {dominant}
                        </span>
                        <span className="mood-timestamp">
                          📅 {formatDate(item.timestamp || item.createdAt)}
                        </span>
                        {item.sessionId && (
                          <span className="session-tag" title={`Session ID: ${item.sessionId}`}>
                            🔑 {item.sessionId.length > 18 ? `${item.sessionId.substring(0, 18)}...` : item.sessionId}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteEntry(item._id)}
                        disabled={isDeleting}
                        className="delete-entry-btn"
                        title="Delete this record"
                      >
                        {isDeleting ? '...' : '✕'}
                      </button>
                    </div>

                    <div className="mood-item-body">
                      <h4>Expression Probabilities</h4>
                      {renderProbabilities(item.emotionProbabilities)}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MoodHistory;
