import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { getSessionId, startNewSession, endActiveSession } from '../utils/session';
import './MoodJourney.css';

const API_BASE_URL = 'http://localhost:3000/api/sessions';

const EMOJI_MAP = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  neutral: '😐',
  surprised: '😮',
  fearful: '😨',
  disgusted: '🤢'
};

const MoodJourney = () => {
  const { token } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [journeyData, setJourneyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSid, setActiveSid] = useState(getSessionId());

  // Fetch list of user's sessions
  const fetchRecentSessions = async (autoSelectLatest = true) => {
    setLoading(true);
    setError('');
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(API_BASE_URL, config);
      const fetchedSessions = res.data.sessions || [];
      setSessions(fetchedSessions);

      if (autoSelectLatest && fetchedSessions.length > 0) {
        // Auto select active session or latest session
        const currentActive = fetchedSessions.find((s) => s.sessionId === activeSid) || fetchedSessions[0];
        setSelectedSessionId(currentActive.sessionId);
      } else if (fetchedSessions.length === 0 && activeSid) {
        setSelectedSessionId(activeSid);
      }
    } catch (err) {
      console.error('Error fetching recent sessions:', err);
      setError('Failed to load listening sessions.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed journey for a specific session ID
  const fetchSessionJourney = async (sid) => {
    if (!sid) return;
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(`${API_BASE_URL}/${sid}`, config);
      setJourneyData(res.data);
    } catch (err) {
      console.error('Error fetching session journey detail:', err);
      // If 404, reset journey data cleanly
      setJourneyData(null);
    }
  };

  useEffect(() => {
    fetchRecentSessions(true);
  }, [token]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionJourney(selectedSessionId);
    }
  }, [selectedSessionId]);

  const handleStartNewSession = async () => {
    setActionLoading(true);
    try {
      const newSid = await startNewSession(token);
      setActiveSid(newSid);
      setSelectedSessionId(newSid);
      await fetchRecentSessions(false);
      setJourneyData(null);
    } catch (err) {
      console.error('Failed to start new session:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndSession = async () => {
    setActionLoading(true);
    try {
      const endedSid = await endActiveSession(token);
      await fetchRecentSessions(false);
      if (endedSid) {
        setSelectedSessionId(endedSid);
        await fetchSessionJourney(endedSid);
      }
    } catch (err) {
      console.error('Failed to end session:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Active now';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return 'Just started';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const journey = journeyData?.journey || {};
  const timeline = journey.timeline || [];
  const transitions = journey.moodTransitions || [];
  const stats = journey.stats || {};

  return (
    <motion.div
      className="journey-wrapper"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="journey-card">
        {/* Header & Controls */}
        <div className="journey-header">
          <div>
            <h2>Mood <span className="span-elem">Journey</span></h2>
            <p className="journey-subtitle">
              Visualize how your facial expression evolves during listening sessions.
            </p>
          </div>
          <div className="session-action-btns">
            <button
              onClick={handleStartNewSession}
              disabled={actionLoading}
              className="action-btn start-btn"
            >
              ➕ Start Session
            </button>
            <button
              onClick={handleEndSession}
              disabled={actionLoading}
              className="action-btn end-btn"
            >
              🏁 End Session & View Journey
            </button>
          </div>
        </div>

        {/* Sessions Tab Selector */}
        {sessions.length > 0 && (
          <div className="sessions-tab-bar">
            <span className="tab-label">Sessions:</span>
            <div className="tabs-container">
              {sessions.map((s) => {
                const isSelected = selectedSessionId === s.sessionId;
                const isActiveSession = s.sessionId === activeSid && s.status === 'active';

                return (
                  <button
                    key={s.sessionId}
                    onClick={() => setSelectedSessionId(s.sessionId)}
                    className={`session-tab-chip ${isSelected ? 'active' : ''}`}
                  >
                    {isActiveSession && <span className="live-dot" />}
                    <span className="tab-time">{formatDate(s.startedAt)}</span>
                    {s.initialMood && s.finalMood && (
                      <span className="tab-mood-pair">
                        {EMOJI_MAP[s.initialMood.toLowerCase()] || ''} → {EMOJI_MAP[s.finalMood.toLowerCase()] || ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        {loading ? (
          <div className="loading-history">
            <motion.div
              className="history-loader"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            />
            <p>Loading session journey timeline...</p>
          </div>
        ) : !journeyData || timeline.length === 0 ? (
          <div className="empty-journey">
            <div className="empty-icon">🧭</div>
            <h3>No Journey Events Recorded Yet</h3>
            <p>
              Start a listening session, detect your facial expression, and play songs to see your live mood evolution!
            </p>
            <div className="test-flow-guide">
              <strong>Quick Workflow:</strong>
              <ol>
                <li>Click <code>➕ Start Session</code> (or detect mood).</li>
                <li>Go to <strong>Mood Suggestions</strong> & detect your mood.</li>
                <li>Play recommended songs.</li>
                <li>Detect your mood again to see transition!</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="journey-content">
            {/* Top Summary Stats */}
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-title">Starting Mood</span>
                <div className="stat-value">
                  {journey.initialMood ? (
                    <span className={`mood-badge ${journey.initialMood.emotion.toLowerCase()}`}>
                      {EMOJI_MAP[journey.initialMood.emotion.toLowerCase()]} {journey.initialMood.emotion} ({journey.initialMood.percentage}%)
                    </span>
                  ) : 'N/A'}
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-title">Final Mood</span>
                <div className="stat-value">
                  {journey.finalMood ? (
                    <span className={`mood-badge ${journey.finalMood.emotion.toLowerCase()}`}>
                      {EMOJI_MAP[journey.finalMood.emotion.toLowerCase()]} {journey.finalMood.emotion} ({journey.finalMood.percentage}%)
                    </span>
                  ) : 'N/A'}
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-title">Songs Played</span>
                <div className="stat-value highlight">{stats.totalSongsPlayed || 0} tracks</div>
              </div>

              <div className="stat-card">
                <span className="stat-title">Session Duration</span>
                <div className="stat-value highlight">{formatDuration(stats.durationSeconds)}</div>
              </div>
            </div>

            {/* Mood Transition Flow Diagram (e.g. Sad 72% ↓ Neutral 61% ↓ Happy 68%) */}
            {transitions.length > 0 && (
              <div className="transition-flow-card">
                <h3>Mood Progression Flow</h3>
                <div className="transition-nodes">
                  {transitions.map((t, idx) => (
                    <React.Fragment key={idx}>
                      <motion.div
                        className="transition-node"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <span className="node-step">Step {idx + 1}</span>
                        <div className={`node-badge ${t.emotion.toLowerCase()}`}>
                          <span className="node-emoji">{EMOJI_MAP[t.emotion.toLowerCase()]}</span>
                          <span className="node-label">{t.emotion}</span>
                          <span className="node-conf">{t.percentage}%</span>
                        </div>
                        <span className="node-time">{formatDate(t.timestamp)}</span>
                      </motion.div>

                      {idx < transitions.length - 1 && (
                        <div className="transition-arrow-wrapper">
                          <span className="transition-arrow">↓</span>
                          <span className="transition-arrow-horizontal">➔</span>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Complete Chronological Journey Timeline */}
            <div className="timeline-section">
              <h3>Chronological Session Timeline</h3>
              <div className="timeline-list">
                {timeline.map((event, idx) => {
                  const isMood = event.type === 'mood';
                  const isSong = event.type === 'song';

                  return (
                    <motion.div
                      key={event.id || idx}
                      className={`timeline-item ${event.type}`}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="timeline-marker">
                        <div className="marker-icon">
                          {isMood ? '🎭' : '🎵'}
                        </div>
                        <div className="marker-line" />
                      </div>

                      <div className="timeline-card-box">
                        <div className="timeline-card-header">
                          <span className="timeline-type-tag">
                            {isMood ? 'Facial Expression Scan' : 'Song Playback'}
                          </span>
                          <span className="timeline-time">{formatDate(event.timestamp)}</span>
                        </div>

                        {isMood && (
                          <div className="timeline-mood-details">
                            <div className="mood-scan-dominant">
                              <span className={`mood-badge ${event.dominantEmotion.toLowerCase()}`}>
                                {EMOJI_MAP[event.dominantEmotion.toLowerCase()]} {event.dominantEmotion}
                              </span>
                              <span className="confidence-pill">
                                Confidence: {Math.round(event.confidence * 100)}%
                              </span>
                            </div>

                            {event.emotionProbabilities && (
                              <div className="mini-prob-chips">
                                {Object.entries(event.emotionProbabilities).map(([emo, val]) => {
                                  const pct = Math.round(val * 100);
                                  if (pct <= 0) return null;
                                  return (
                                    <span key={emo} className="prob-chip">
                                      {emo}: {pct}%
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {isSong && (
                          <div className="timeline-song-details">
                            <div className="song-info">
                              <span className="song-title">{event.song?.title || 'Untitled Track'}</span>
                              <span className="song-artist">by {event.song?.artist || 'Unknown Artist'}</span>
                            </div>
                            {event.duration > 0 && (
                              <span className="duration-pill">
                                ⏱️ Played {event.duration}s
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MoodJourney;
