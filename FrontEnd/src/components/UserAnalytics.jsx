import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './UserAnalytics.css';

const API_BASE_URL = 'http://localhost:3000/api/analytics';

const EMOJI_MAP = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  neutral: '😐',
  surprised: '😮',
  fearful: '😨',
  disgusted: '🤢'
};

const UserAnalytics = () => {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(API_BASE_URL, config);
      setData(res.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load user analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0 mins';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recent';
    const d = new Date(dateString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const listeningStats = data?.listeningStats || {};
  const musicPreferences = data?.musicPreferences || {};
  const moodStats = data?.moodStats || {};
  const moodJourneySummary = data?.moodJourneySummary || [];

  const topGenre = musicPreferences.favoriteGenres?.[0]?.genre || 'N/A';
  const dominantMood = moodStats.mostCommonMood || 'neutral';
  const dominantMoodEmoji = EMOJI_MAP[dominantMood.toLowerCase()] || '😐';

  return (
    <motion.div
      className="analytics-wrapper"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="analytics-card">
        {/* Header */}
        <div className="analytics-header">
          <div>
            <h2>User <span className="span-elem">Analytics</span></h2>
            <p className="analytics-subtitle">
              Personalized insights generated from your listening history, mood scans, likes & sessions
            </p>
          </div>
          <button className="refresh-btn" onClick={fetchAnalytics} disabled={loading}>
            🔄 Refresh Analytics
          </button>
        </div>

        {loading ? (
          <div className="analytics-loading">
            <motion.div
              className="analytics-loader"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            />
            <p>Analyzing your musical & mood history...</p>
          </div>
        ) : error ? (
          <div className="analytics-empty">
            <div className="empty-icon">⚠️</div>
            <h3>Unable to Load Analytics</h3>
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Overview Banner Cards */}
            <div className="overview-stats-grid">
              <div className="summary-card">
                <div className="summary-icon">🎵</div>
                <div className="summary-info">
                  <span className="label">Total Songs Played</span>
                  <span className="val">{listeningStats.totalSongsPlayed || 0}</span>
                  <span className="sub">Recorded plays</span>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon">⏱️</div>
                <div className="summary-info">
                  <span className="label">Total Listening Time</span>
                  <span className="val">{formatDuration(listeningStats.totalListeningSeconds)}</span>
                  <span className="sub">Time spent enjoying music</span>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon">{dominantMoodEmoji}</div>
                <div className="summary-info">
                  <span className="label">Dominant Mood</span>
                  <span className="val" style={{ textTransform: 'capitalize' }}>
                    {dominantMood}
                  </span>
                  <span className="sub">{moodStats.totalMoodScans || 0} mood scans</span>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon">🎧</div>
                <div className="summary-info">
                  <span className="label">Top Favorite Genre</span>
                  <span className="val" style={{ textTransform: 'capitalize' }}>
                    {topGenre}
                  </span>
                  <span className="sub">Primary preference</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="analytics-nav-tabs">
              <button
                className={`analytics-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                📊 Overview
              </button>
              <button
                className={`analytics-tab-btn ${activeTab === 'listening' ? 'active' : ''}`}
                onClick={() => setActiveTab('listening')}
              >
                🎵 Listening Statistics
              </button>
              <button
                className={`analytics-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
                onClick={() => setActiveTab('preferences')}
              >
                🎧 Music Preferences
              </button>
              <button
                className={`analytics-tab-btn ${activeTab === 'mood' ? 'active' : ''}`}
                onClick={() => setActiveTab('mood')}
              >
                🎭 Mood Statistics
              </button>
              <button
                className={`analytics-tab-btn ${activeTab === 'journey' ? 'active' : ''}`}
                onClick={() => setActiveTab('journey')}
              >
                🧭 Mood Journey Summary
              </button>
            </div>

            {/* SECTION 1: LISTENING STATISTICS */}
            {(activeTab === 'all' || activeTab === 'listening') && (
              <div className="analytics-section">
                <h3 className="section-title">🎵 Listening Statistics</h3>

                <div className="cards-grid-2">
                  {/* Most Played Songs */}
                  <div className="analytics-panel">
                    <h4>🔥 Most Played Songs</h4>
                    {listeningStats.mostPlayedSongs?.length > 0 ? (
                      <div className="song-analytics-list">
                        {listeningStats.mostPlayedSongs.map((item, idx) => (
                          <div key={item._id || idx} className="song-analytics-item">
                            <div className="item-left">
                              <span className={`rank-badge top-${idx + 1}`}>{idx + 1}</span>
                              <div className="song-meta">
                                <span className="title">{item.title}</span>
                                <span className="artist">{item.artist} • {item.genre}</span>
                              </div>
                            </div>
                            <div className="item-right">
                              <span className="metric-pill">▶ {item.playCount} plays</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No play count data recorded yet.</p>
                    )}
                  </div>

                  {/* Recently Played Songs */}
                  <div className="analytics-panel">
                    <h4>🕒 Recently Played Songs</h4>
                    {listeningStats.recentlyPlayed?.length > 0 ? (
                      <div className="song-analytics-list">
                        {listeningStats.recentlyPlayed.map((item, idx) => (
                          <div key={item._id || idx} className="song-analytics-item">
                            <div className="item-left">
                              <span className="rank-badge">{idx + 1}</span>
                              <div className="song-meta">
                                <span className="title">{item.song?.title || 'Unknown Track'}</span>
                                <span className="artist">
                                  {item.song?.artist || 'Artist'} • {formatDate(item.startedAt)}
                                </span>
                              </div>
                            </div>
                            <div className="item-right">
                              {item.detectedMood && (
                                <span className="metric-pill">
                                  {EMOJI_MAP[item.detectedMood.toLowerCase()] || ''} {item.detectedMood}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No recent playback history found.</p>
                    )}
                  </div>
                </div>

                <div className="cards-grid-3">
                  {/* Most Liked Songs */}
                  <div className="analytics-panel">
                    <h4>❤️ Most Liked Songs</h4>
                    {listeningStats.mostLikedSongs?.length > 0 ? (
                      <div className="song-analytics-list">
                        {listeningStats.mostLikedSongs.map((item, idx) => (
                          <div key={item._id || idx} className="song-analytics-item">
                            <div className="item-left">
                              <span className="rank-badge">❤️</span>
                              <div className="song-meta">
                                <span className="title">{item.title}</span>
                                <span className="artist">{item.artist}</span>
                              </div>
                            </div>
                            <div className="item-right">
                              <span className="metric-pill liked">Liked</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No liked songs in your library.</p>
                    )}
                  </div>

                  {/* Most Skipped Songs */}
                  <div className="analytics-panel">
                    <h4>⏭️ Most Skipped Songs</h4>
                    {listeningStats.mostSkippedSongs?.length > 0 ? (
                      <div className="song-analytics-list">
                        {listeningStats.mostSkippedSongs.map((item, idx) => (
                          <div key={item._id || idx} className="song-analytics-item">
                            <div className="item-left">
                              <span className="rank-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}>
                                ⏭️
                              </span>
                              <div className="song-meta">
                                <span className="title">{item.title}</span>
                                <span className="artist">{item.artist}</span>
                              </div>
                            </div>
                            <div className="item-right">
                              <span className="metric-pill skip">{item.skipCount} skips</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No skipped songs recorded.</p>
                    )}
                  </div>

                  {/* Most Replayed Songs */}
                  <div className="analytics-panel">
                    <h4>🔁 Most Replayed Songs</h4>
                    {listeningStats.mostReplayedSongs?.length > 0 ? (
                      <div className="song-analytics-list">
                        {listeningStats.mostReplayedSongs.map((item, idx) => (
                          <div key={item._id || idx} className="song-analytics-item">
                            <div className="item-left">
                              <span className="rank-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7' }}>
                                🔁
                              </span>
                              <div className="song-meta">
                                <span className="title">{item.title}</span>
                                <span className="artist">{item.artist}</span>
                              </div>
                            </div>
                            <div className="item-right">
                              <span className="metric-pill replay">{item.replayCount} replays</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No replayed songs recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: MUSIC PREFERENCES */}
            {(activeTab === 'all' || activeTab === 'preferences') && (
              <div className="analytics-section">
                <h3 className="section-title">🎧 Music Preferences</h3>

                <div className="cards-grid-2">
                  {/* Favorite Genres */}
                  <div className="analytics-panel">
                    <h4>🎼 Favorite Genres</h4>
                    {musicPreferences.favoriteGenres?.length > 0 ? (
                      <div>
                        {musicPreferences.favoriteGenres.map((g) => {
                          const total = musicPreferences.favoriteGenres.reduce((a, b) => a + b.playCount, 0);
                          const pct = total > 0 ? Math.round((g.playCount / total) * 100) : 0;
                          return (
                            <div key={g.genre} className="preference-bar-item">
                              <div className="pref-label-row">
                                <span className="pref-name">{g.genre}</span>
                                <span className="pref-val">{g.playCount} plays ({pct}%)</span>
                              </div>
                              <div className="progress-track">
                                <div className="progress-fill" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No genre analytics available yet.</p>
                    )}
                  </div>

                  {/* Favorite Languages */}
                  <div className="analytics-panel">
                    <h4>🌐 Favorite Languages</h4>
                    {musicPreferences.favoriteLanguages?.length > 0 ? (
                      <div className="languages-grid">
                        {musicPreferences.favoriteLanguages.map((l) => (
                          <div key={l.language} className="lang-chip">
                            <span>🗣️ {l.language}</span>
                            <strong>{l.playCount} plays</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No language data collected.</p>
                    )}
                  </div>
                </div>

                <div className="cards-grid-2">
                  {/* Energy Level Analytics */}
                  <div className="analytics-panel">
                    <h4>⚡ Energy Level Analytics</h4>
                    <div className="energy-gauge-box">
                      <div
                        className="energy-dial"
                        style={{ '--energy-pct': `${musicPreferences.energyLevel?.avgEnergy || 50}%` }}
                      >
                        <div className="energy-dial-inner">
                          <span className="energy-val">{musicPreferences.energyLevel?.avgEnergy || 50}</span>
                          <span className="energy-max">/ 100</span>
                        </div>
                      </div>
                      <span className="energy-category">
                        {musicPreferences.energyLevel?.category || 'Moderate Energy'}
                      </span>
                      <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginTop: '0.5rem' }}>
                        Calculated average track energy level based on your song listening habits.
                      </p>
                    </div>
                  </div>

                  {/* Most Played Artists */}
                  <div className="analytics-panel">
                    <h4>🎤 Most Played Artists</h4>
                    {musicPreferences.mostPlayedArtists?.length > 0 ? (
                      <div className="song-analytics-list">
                        {musicPreferences.mostPlayedArtists.map((artist, idx) => (
                          <div key={artist.artist || idx} className="song-analytics-item">
                            <div className="item-left">
                              <span className={`rank-badge top-${idx + 1}`}>{idx + 1}</span>
                              <div className="song-meta">
                                <span className="title">{artist.artist}</span>
                                <span className="artist">{formatDuration(artist.totalDuration)} listened</span>
                              </div>
                            </div>
                            <div className="item-right">
                              <span className="metric-pill">▶ {artist.playCount} plays</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No artist data found.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: MOOD STATISTICS */}
            {(activeTab === 'all' || activeTab === 'mood') && (
              <div className="analytics-section">
                <h3 className="section-title">🎭 Mood Statistics</h3>

                <div className="cards-grid-2">
                  {/* Mood Distribution */}
                  <div className="analytics-panel">
                    <h4>📊 Mood Distribution</h4>
                    {moodStats.moodDistribution?.length > 0 ? (
                      <div className="mood-dist-list">
                        {moodStats.moodDistribution.map((m) => {
                          const emoName = m.mood.toLowerCase();
                          const emoji = EMOJI_MAP[emoName] || '😐';

                          return (
                            <div key={m.mood} className="mood-dist-item">
                              <div className="mood-dist-row">
                                <span className={`mood-badge-inline ${emoName}`}>
                                  {emoji} <span style={{ textTransform: 'capitalize' }}>{m.mood}</span>
                                </span>
                                <span style={{ color: '#d8b4fe' }}>
                                  {m.count} scans ({m.percentage}%)
                                </span>
                              </div>
                              <div className="progress-track">
                                <div className="progress-fill" style={{ width: `${m.percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No facial mood scans recorded yet.</p>
                    )}
                  </div>

                  {/* Mood Recent Scans Timeline */}
                  <div className="analytics-panel">
                    <h4>📈 Mood Over Time (Recent Scans)</h4>
                    {moodStats.recentMoodScans?.length > 0 ? (
                      <div className="timeline-mini-list">
                        {moodStats.recentMoodScans.map((scan, idx) => {
                          const emoName = scan.dominantEmotion.toLowerCase();
                          const emoji = EMOJI_MAP[emoName] || '😐';
                          return (
                            <div key={scan._id || idx} className="timeline-mini-card">
                              <span className={`mood-badge-inline ${emoName}`}>
                                {emoji} {scan.dominantEmotion}
                              </span>
                              <span className="timeline-mini-date">{formatDate(scan.timestamp)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No recent mood detections available.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: MOOD JOURNEY SUMMARY */}
            {(activeTab === 'all' || activeTab === 'journey') && (
              <div className="analytics-section">
                <h3 className="section-title">🧭 Mood Journey Summary</h3>
                <p style={{ color: '#a1a1aa', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                  Overview of your recent listening sessions tracking how your mood evolved from start to end.
                </p>

                {moodJourneySummary.length > 0 ? (
                  <div className="session-summary-grid">
                    {moodJourneySummary.map((session) => {
                      const initEmo = session.initialMood ? session.initialMood.toLowerCase() : 'neutral';
                      const finalEmo = session.finalMood ? session.finalMood.toLowerCase() : 'neutral';

                      return (
                        <div key={session.sessionId} className="session-summary-card">
                          <div className="session-top">
                            <span className="session-id-tag">Session: {session.sessionId.slice(-8)}</span>
                            <span className="session-status">{session.status}</span>
                          </div>

                          <div className="session-mood-transition">
                            <span>
                              {EMOJI_MAP[initEmo] || ''} <span style={{ textTransform: 'capitalize' }}>{session.initialMood}</span>
                            </span>
                            <span style={{ color: '#b26cff' }}>➔</span>
                            <span>
                              {EMOJI_MAP[finalEmo] || ''} <span style={{ textTransform: 'capitalize' }}>{session.finalMood}</span>
                            </span>
                          </div>

                          <div className="session-bottom-info">
                            <span>🎵 {session.songCount} songs</span>
                            <span>⏱️ {formatDuration(session.durationSeconds)}</span>
                            <span>🎭 {session.moodCount} scans</span>
                          </div>

                          <button
                            className="view-journey-btn"
                            onClick={() => navigate('/mood-journey')}
                          >
                            Explore Detailed Journey ➔
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="analytics-empty">
                    <p style={{ color: '#a1a1aa' }}>No recent mood journey sessions recorded.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default UserAnalytics;
