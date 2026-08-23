import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './ListeningHistory.css';

const API_BASE_URL = 'http://localhost:3000/api/history';

const ListeningHistory = () => {
  const { token } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(API_BASE_URL, config);
      setHistory(res.data.history || []);
    } catch (err) {
      console.error('Error fetching listening history:', err);
      setError('Failed to load listening history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your listening history?')) {
      return;
    }

    setClearing(true);
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.delete(API_BASE_URL, config);
      setHistory([]);
    } catch (err) {
      console.error('Error clearing listening history:', err);
      alert('Failed to clear listening history.');
    } finally {
      setClearing(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      className="history-wrapper"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="history-card">
        <div className="history-header">
          <h2>Listening <span className="span-elem">History</span></h2>
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              disabled={clearing}
              className="clear-btn"
            >
              {clearing ? 'Clearing...' : 'Clear History'}
            </button>
          )}
        </div>

        {error && <p style={{ color: '#ff6b6b', marginBottom: '1rem' }}>{error}</p>}

        {loading ? (
          <div className="loading-history">
            <motion.div
              className="history-loader"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            />
            <p>Loading your playback history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="empty-history">
            <p>🎵 No listening history recorded yet.</p>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>
              Listen to songs on the player to build your history!
            </span>
          </div>
        ) : (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Song</th>
                  <th>Artist</th>
                  <th>Played Date</th>
                  <th>Mood</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => {
                  const song = item.songId || {};
                  const mood = item.detectedMood || song.mood || 'neutral';
                  return (
                    <motion.tr
                      key={item._id || index}
                      className="history-row"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <td className="song-title-cell">{song.title || song.artist || 'Untitled Song'}</td>
                      <td className="artist-cell">{song.title ? song.artist : (song.artist || 'Unknown Artist')}</td>
                      <td>{formatDate(item.startedAt || item.createdAt)}</td>
                      <td>
                        <span className={`mood-badge ${mood.toLowerCase()}`}>
                          {mood}
                        </span>
                      </td>
                      <td className="duration-cell">{formatDuration(item.listeningDuration)}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ListeningHistory;
