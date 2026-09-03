import React, { useState, useEffect, useRef, useContext } from "react";
import "./MoodSongs.css";
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

const MoodSongs = ({ Songs, loading, mood }) => {
  const { user, token } = useContext(AuthContext);
  const activeSessions = useRef({});
  const audioRefs = useRef({});

  const [likedSongIds, setLikedSongIds] = useState(new Set());
  const [actionFeedback, setActionFeedback] = useState({});

  // Fetch current user's liked songs on mount or auth change
  useEffect(() => {
    const fetchLikedSongs = async () => {
      if (!token) {
        setLikedSongIds(new Set());
        return;
      }
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get(`${API_BASE_URL}/api/feedback/liked`, config);
        if (response.data && response.data.likedSongIds) {
          setLikedSongIds(new Set(response.data.likedSongIds));
        }
      } catch (err) {
        console.error('Error fetching liked songs:', err);
      }
    };

    fetchLikedSongs();
  }, [token, user]);

  const showFeedbackToast = (songId, message) => {
    setActionFeedback((prev) => ({ ...prev, [songId]: message }));
    setTimeout(() => {
      setActionFeedback((prev) => {
        const next = { ...prev };
        delete next[songId];
        return next;
      });
    }, 2000);
  };

  const getSessionId = () => {
    let sid = sessionStorage.getItem('moody_session_id');
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('moody_session_id', sid);
    }
    return sid;
  };

  const handleToggleLike = async (song) => {
    if (!user || !token) {
      alert('Please log in to like songs');
      return;
    }
    const songIdStr = song._id.toString();
    const isLiked = likedSongIds.has(songIdStr);
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (isLiked) {
        // Optimistic UI update
        setLikedSongIds((prev) => {
          const next = new Set(prev);
          next.delete(songIdStr);
          return next;
        });
        await axios.post(`${API_BASE_URL}/api/feedback/unlike`, { songId: song._id }, config);
        showFeedbackToast(song._id, 'Unliked track');
      } else {
        // Optimistic UI update
        setLikedSongIds((prev) => new Set(prev).add(songIdStr));
        await axios.post(`${API_BASE_URL}/api/feedback/like`, { songId: song._id }, config);
        showFeedbackToast(song._id, 'Liked track ❤️');
      }
    } catch (err) {
      console.error('Error updating like status:', err);
      // Revert state on error
      setLikedSongIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(songIdStr);
        else next.delete(songIdStr);
        return next;
      });
    }
  };

  const handleRecordSkip = async (song) => {
    if (!user || !token) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_BASE_URL}/api/feedback/skip`, { songId: song._id }, config);
      showFeedbackToast(song._id, 'Recorded Skip ⏭️');

      // Pause playback if currently playing
      const audioEl = audioRefs.current[song._id];
      if (audioEl && !audioEl.paused) {
        audioEl.pause();
      }
    } catch (err) {
      console.error('Error recording skip:', err);
    }
  };

  const handleRecordReplay = async (song) => {
    if (!user || !token) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_BASE_URL}/api/feedback/replay`, { songId: song._id }, config);
      showFeedbackToast(song._id, 'Recorded Replay 🔄');

      // Restart and play audio
      const audioEl = audioRefs.current[song._id];
      if (audioEl) {
        audioEl.currentTime = 0;
        audioEl.play().catch((e) => console.log('Audio autoplay error:', e));
      }
    } catch (err) {
      console.error('Error recording replay:', err);
    }
  };

  const handleAudioPlay = async (song, event) => {
    if (!user || !song || !song._id) return;

    try {
      const startedAt = new Date().toISOString();
      const sessionId = getSessionId();

      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const response = await axios.post(
        `${API_BASE_URL}/api/history`,
        {
          songId: song._id,
          detectedMood: mood || song.mood || 'neutral',
          startedAt,
          sessionId
        },
        config
      );

      if (response.data && response.data.history) {
        activeSessions.current[song._id] = {
          historyId: response.data.history._id,
          startTime: Date.now(),
          audioElement: event.target
        };
      }
    } catch (err) {
      console.error('Error recording listening start:', err);
    }
  };

  const handleAudioPauseOrEnd = async (song, event, isEnded = false) => {
    if (!user || !song || !song._id) return;

    const session = activeSessions.current[song._id];
    if (!session || !session.historyId) return;

    try {
      const completedAt = new Date().toISOString();
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - session.startTime) / 1000));
      const audioDuration = Math.round(event.target.currentTime || elapsedSeconds);
      const listeningDuration = Math.min(elapsedSeconds, audioDuration > 0 ? audioDuration : elapsedSeconds);

      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      await axios.post(
        `${API_BASE_URL}/api/history`,
        {
          historyId: session.historyId,
          completedAt,
          listeningDuration
        },
        config
      );

      delete activeSessions.current[song._id];
    } catch (err) {
      console.error('Error recording listening end:', err);
    }
  };

  return (
    <div className="mood-songs">
      <div className="mood-header">
        <h2>Recommended Songs</h2>
        {mood && <div className="mood-tag">Mood: {mood}</div>}
      </div>

      <div className="list-content">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              className="loading-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="fetching-loader"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              />
              <p>Fetching your mood tunes...</p>
            </motion.div>
          ) : (
            <motion.div
              key="songs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {Songs.length > 0 ? (
                Songs.map((song, index) => {
                  const songIdStr = song._id ? song._id.toString() : '';
                  const isLiked = likedSongIds.has(songIdStr);
                  const toastMsg = actionFeedback[song._id];

                  return (
                    <motion.div
                      key={song._id || index}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="song-item"
                    >
                      <div className="title">
                        <div className="song-info-header">
                          <div>
                            <p style={{ fontWeight: 'bold', color: '#ffffff', marginBottom: '0.2rem' }}>
                              {song.title || song.artist || 'Untitled Song'}
                            </p>
                            <p style={{ fontSize: '0.85rem', color: '#b0b0b0', marginBottom: '0.5rem' }}>
                              👤 {song.title ? song.artist : (song.artist || 'Unknown Artist')} {song.mood ? `• 🎭 ${song.mood}` : ''}
                            </p>
                          </div>
                          
                          {/* Like Button */}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleToggleLike(song)}
                            className={`like-btn ${isLiked ? 'liked' : ''}`}
                            title={isLiked ? "Unlike song" : "Like song"}
                          >
                            {isLiked ? '❤️' : '🤍'}
                          </motion.button>
                        </div>

                        {/* Audio Player and Action Controls */}
                        <div className="player-controls-wrapper">
                          <audio
                            ref={(el) => (audioRefs.current[song._id] = el)}
                            src={song.audio}
                            controls
                            onPlay={(e) => handleAudioPlay(song, e)}
                            onPause={(e) => handleAudioPauseOrEnd(song, e, false)}
                            onEnded={(e) => {
                              handleAudioPauseOrEnd(song, e, true);
                            }}
                          />

                          <div className="action-buttons-group">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRecordSkip(song)}
                              className="feedback-btn skip-btn"
                              title="Skip song"
                            >
                              ⏭️ Skip
                            </motion.button>

                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRecordReplay(song)}
                              className="feedback-btn replay-btn"
                              title="Replay song"
                            >
                              🔄 Replay
                            </motion.button>
                          </div>
                        </div>

                        {/* Event Feedback Toast */}
                        <AnimatePresence>
                          {toastMsg && (
                            <motion.div
                              className="feedback-toast"
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                            >
                              {toastMsg}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <p className="placeholder">Scan your face to see song recommendations</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MoodSongs;