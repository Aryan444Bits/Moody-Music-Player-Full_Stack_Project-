import React, { useState, useRef, useContext } from "react";
import "./MoodSongs.css";
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

const MoodSongs = ({ Songs, loading, mood }) => {
  const { user, token } = useContext(AuthContext);
  const activeSessions = useRef({});

  const getSessionId = () => {
    let sid = sessionStorage.getItem('moody_session_id');
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('moody_session_id', sid);
    }
    return sid;
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
                Songs.map((song, index) => (
                  <motion.div
                    key={song._id || index}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="song-item"
                  >
                    <div className="title">
                      <p style={{ fontWeight: 'bold', color: '#ffffff', marginBottom: '0.2rem' }}>
                        {song.title || song.artist || 'Untitled Song'}
                      </p>
                      <p style={{ fontSize: '0.85rem', color: '#b0b0b0', marginBottom: '0.5rem' }}>
                        👤 {song.title ? song.artist : (song.artist || 'Unknown Artist')} {song.mood ? `• 🎭 ${song.mood}` : ''}
                      </p>
                      <audio
                        src={song.audio}
                        controls
                        onPlay={(e) => handleAudioPlay(song, e)}
                        onPause={(e) => handleAudioPauseOrEnd(song, e, false)}
                        onEnded={(e) => handleAudioPauseOrEnd(song, e, true)}
                      />
                    </div>
                  </motion.div>
                ))
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