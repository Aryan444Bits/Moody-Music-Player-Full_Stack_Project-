import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './AdminDashboard.css';

const API_BASE_URL = 'http://localhost:3000/api/admin';

const EMOJI_MAP = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  neutral: '😐',
  surprised: '😮',
  fearful: '😨',
  disgusted: '🤢'
};

const AdminDashboard = () => {
  const { token, user: currentUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Overview Data
  const [overview, setOverview] = useState(null);

  // Songs Data
  const [songs, setSongs] = useState([]);
  const [songSearch, setSongSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    artist: '',
    genre: 'Pop',
    language: 'English',
    mood: 'happy',
    energy: 50,
    tags: '',
    duration: 180,
    audioFile: null
  });
  const [editingSong, setEditingSong] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    artist: '',
    genre: '',
    language: '',
    mood: '',
    energy: 50,
    tags: '',
    duration: 0
  });

  // Users Data
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserStats, setSelectedUserStats] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Analytics Data
  const [platformAnalytics, setPlatformAnalytics] = useState(null);

  const getAxiosConfig = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  // Fetch data based on active tab
  const fetchOverview = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/overview`, getAxiosConfig());
      setOverview(res.data.overview);
    } catch (err) {
      console.error('Error fetching admin overview:', err);
    }
  };

  const fetchSongs = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/songs?search=${encodeURIComponent(songSearch)}`, getAxiosConfig());
      setSongs(res.data.songs);
    } catch (err) {
      console.error('Error fetching admin songs:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/users`, getAxiosConfig());
      setUsers(res.data.users);
    } catch (err) {
      console.error('Error fetching admin users:', err);
    }
  };

  const fetchPlatformAnalytics = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/analytics`, getAxiosConfig());
      setPlatformAnalytics(res.data.analytics);
    } catch (err) {
      console.error('Error fetching platform analytics:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([fetchOverview(), fetchSongs(), fetchUsers(), fetchPlatformAnalytics()]);
    } catch (err) {
      setError('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'songs') fetchSongs();
  }, [songSearch]);

  // Song Upload Handler
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.audioFile || !uploadForm.title || !uploadForm.artist) {
      alert('Please fill in Title, Artist, and select an Audio File.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('audio', uploadForm.audioFile);
      formData.append('title', uploadForm.title);
      formData.append('artist', uploadForm.artist);
      formData.append('genre', uploadForm.genre);
      formData.append('language', uploadForm.language);
      formData.append('mood', uploadForm.mood);
      formData.append('energy', uploadForm.energy);
      formData.append('tags', uploadForm.tags);
      formData.append('duration', uploadForm.duration);

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      };

      await axios.post(`${API_BASE_URL}/songs`, formData, config);
      setShowUploadModal(false);
      setUploadForm({
        title: '',
        artist: '',
        genre: 'Pop',
        language: 'English',
        mood: 'happy',
        energy: 50,
        tags: '',
        duration: 180,
        audioFile: null
      });
      fetchSongs();
      fetchOverview();
      alert('Song uploaded successfully!');
    } catch (err) {
      console.error('Error uploading song:', err);
      alert(err.response?.data?.message || 'Failed to upload song.');
    } finally {
      setUploading(false);
    }
  };

  // Song Edit Handler
  const handleEditClick = (song) => {
    setEditingSong(song);
    setEditForm({
      title: song.title || '',
      artist: song.artist || '',
      genre: song.genre || 'Unknown',
      language: song.language || 'Unknown',
      mood: song.mood || 'neutral',
      energy: song.energy !== undefined ? song.energy : 50,
      tags: Array.isArray(song.tags) ? song.tags.join(', ') : '',
      duration: song.duration || 0
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingSong) return;
    try {
      await axios.put(`${API_BASE_URL}/songs/${editingSong._id}`, editForm, getAxiosConfig());
      setEditingSong(null);
      fetchSongs();
      alert('Song metadata updated successfully!');
    } catch (err) {
      console.error('Error updating song:', err);
      alert(err.response?.data?.message || 'Failed to update song.');
    }
  };

  // Song Delete Handler
  const handleDeleteSong = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/songs/${id}`, getAxiosConfig());
      fetchSongs();
      fetchOverview();
    } catch (err) {
      console.error('Error deleting song:', err);
      alert(err.response?.data?.message || 'Failed to delete song.');
    }
  };

  // User Actions
  const handleViewUserStats = async (userId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/users/${userId}/stats`, getAxiosConfig());
      setSelectedUserStats(res.data);
      setShowStatsModal(true);
    } catch (err) {
      console.error('Error fetching user stats:', err);
      alert('Failed to load user statistics.');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const action = currentStatus ? 'enable' : 'disable';
    if (!window.confirm(`Are you sure you want to ${action} this user account?`)) return;
    try {
      await axios.put(`${API_BASE_URL}/users/${userId}/status`, {}, getAxiosConfig());
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  const handleToggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change user role to '${newRole}'?`)) return;
    try {
      await axios.put(`${API_BASE_URL}/users/${userId}/role`, { role: newRole }, getAxiosConfig());
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user role.');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}"?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/users/${userId}`, getAxiosConfig());
      fetchUsers();
      fetchOverview();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <motion.div
      className="admin-wrapper"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="admin-card">
        {/* Header */}
        <div className="admin-header">
          <div>
            <h2>Admin <span className="span-elem">Dashboard</span></h2>
            <p className="admin-subtitle">
              System management panel for Moody Music Player (Songs, Users & Platform Analytics)
            </p>
          </div>
          <button className="action-btn-primary" onClick={loadData} disabled={loading}>
            🔄 Refresh System Data
          </button>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="admin-tabs">
          <button
            className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📌 System Overview
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'songs' ? 'active' : ''}`}
            onClick={() => setActiveTab('songs')}
          >
            🎵 Song Management ({songs.length})
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 User Management ({users.length})
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 System Analytics
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#a1a1aa' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(178, 108, 255, 0.3)',
                borderTop: '3px solid #b26cff',
                borderRadius: '50%',
                margin: '0 auto 1rem auto'
              }}
            />
            <p>Loading Admin Control Panel...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#ff6b6b' }}>
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* SECTION 1: OVERVIEW */}
            {activeTab === 'overview' && overview && (
              <div>
                <div className="overview-stats-grid">
                  <div className="summary-card">
                    <div className="summary-icon">👥</div>
                    <div className="summary-info">
                      <span className="label">Registered Users</span>
                      <span className="val">{overview.totalUsers}</span>
                      <span className="sub">Accounts created</span>
                    </div>
                  </div>

                  <div className="summary-card">
                    <div className="summary-icon">🎵</div>
                    <div className="summary-info">
                      <span className="label">Total Music Tracks</span>
                      <span className="val">{overview.totalSongs}</span>
                      <span className="sub">Uploaded songs</span>
                    </div>
                  </div>

                  <div className="summary-card">
                    <div className="summary-icon">▶</div>
                    <div className="summary-info">
                      <span className="label">Total Playbacks</span>
                      <span className="val">{overview.totalPlays}</span>
                      <span className="sub">History events</span>
                    </div>
                  </div>

                  <div className="summary-card">
                    <div className="summary-icon">
                      {EMOJI_MAP[overview.dominantMood?.toLowerCase()] || '🎭'}
                    </div>
                    <div className="summary-info">
                      <span className="label">Platform Mood</span>
                      <span className="val" style={{ textTransform: 'capitalize' }}>
                        {overview.dominantMood}
                      </span>
                      <span className="sub">{overview.totalMoodScans} total scans</span>
                    </div>
                  </div>
                </div>

                <div className="cards-grid-2">
                  <div className="analytics-panel">
                    <h4>🆕 Recently Uploaded Songs</h4>
                    <div className="song-analytics-list">
                      {overview.recentSongs?.map((song) => (
                        <div key={song._id} className="song-analytics-item">
                          <div className="item-left">
                            <span className="rank-badge">🎵</span>
                            <div className="song-meta">
                              <span className="title">{song.title}</span>
                              <span className="artist">{song.artist} • {song.genre}</span>
                            </div>
                          </div>
                          <span className="metric-pill">{song.mood}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="analytics-panel">
                    <h4>👤 Recently Joined Users</h4>
                    <div className="song-analytics-list">
                      {overview.recentUsers?.map((u) => (
                        <div key={u._id} className="song-analytics-item">
                          <div className="item-left">
                            <span className="rank-badge">👤</span>
                            <div className="song-meta">
                              <span className="title">{u.name}</span>
                              <span className="artist">{u.email}</span>
                            </div>
                          </div>
                          <span className={`badge-role ${u.role}`}>{u.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: SONGS MANAGEMENT */}
            {activeTab === 'songs' && (
              <div>
                <div className="toolbar-row">
                  <input
                    type="text"
                    placeholder="🔍 Search songs by title, artist, tag..."
                    value={songSearch}
                    onChange={(e) => setSongSearch(e.target.value)}
                    className="admin-search-input"
                  />
                  <button className="action-btn-primary" onClick={() => setShowUploadModal(true)}>
                    ➕ Upload New Song
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title & Artist</th>
                        <th>Genre</th>
                        <th>Language</th>
                        <th>Mood</th>
                        <th>Energy</th>
                        <th>Duration</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {songs.length > 0 ? (
                        songs.map((song) => (
                          <tr key={song._id}>
                            <td>
                              <div style={{ fontWeight: '600' }}>{song.title}</div>
                              <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>{song.artist}</div>
                            </td>
                            <td>{song.genre}</td>
                            <td>{song.language}</td>
                            <td>
                              <span className={`mood-badge-inline ${song.mood}`}>
                                {EMOJI_MAP[song.mood] || ''} {song.mood}
                              </span>
                            </td>
                            <td>⚡ {song.energy}/100</td>
                            <td>{formatDuration(song.duration)}</td>
                            <td>
                              <div className="table-action-btns">
                                <button className="btn-icon" onClick={() => handleEditClick(song)}>
                                  ✏️ Edit
                                </button>
                                <button
                                  className="btn-icon danger"
                                  onClick={() => handleDeleteSong(song._id, song.title)}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#a1a1aa' }}>
                            No songs found matching query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 3: USERS MANAGEMENT */}
            {activeTab === 'users' && (
              <div>
                <div className="toolbar-row">
                  <input
                    type="text"
                    placeholder="🔍 Search users by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="admin-search-input"
                  />
                </div>

                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((u) => {
                          const isSelf = u._id === currentUser?._id;
                          return (
                            <tr key={u._id}>
                              <td style={{ fontWeight: '600' }}>
                                {u.name} {isSelf && <span style={{ color: '#b26cff' }}>(You)</span>}
                              </td>
                              <td style={{ color: '#a1a1aa' }}>{u.email}</td>
                              <td>
                                <span className={`badge-role ${u.role}`}>{u.role}</span>
                              </td>
                              <td>
                                <span className={`badge-status ${u.isDisabled ? 'disabled' : 'active'}`}>
                                  {u.isDisabled ? 'Disabled' : 'Active'}
                                </span>
                              </td>
                              <td>{formatDate(u.createdAt)}</td>
                              <td>
                                <div className="table-action-btns">
                                  <button className="btn-icon" onClick={() => handleViewUserStats(u._id)}>
                                    📊 Stats
                                  </button>
                                  {!isSelf && (
                                    <>
                                      <button
                                        className="btn-icon"
                                        onClick={() => handleToggleUserRole(u._id, u.role)}
                                      >
                                        👑 {u.role === 'admin' ? 'Demote' : 'Promote'}
                                      </button>
                                      <button
                                        className="btn-icon"
                                        onClick={() => handleToggleUserStatus(u._id, u.isDisabled)}
                                      >
                                        🚫 {u.isDisabled ? 'Enable' : 'Disable'}
                                      </button>
                                      <button
                                        className="btn-icon danger"
                                        onClick={() => handleDeleteUser(u._id, u.name)}
                                      >
                                        🗑️ Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#a1a1aa' }}>
                            No user accounts found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 4: PLATFORM ANALYTICS */}
            {activeTab === 'analytics' && platformAnalytics && (
              <div>
                <h3 className="section-title">📈 Platform-Wide Analytics</h3>

                <div className="cards-grid-2">
                  {/* Most Played Songs */}
                  <div className="analytics-panel">
                    <h4>🔥 Top Played Songs (Platform-Wide)</h4>
                    {platformAnalytics.mostPlayedSongs?.length > 0 ? (
                      <div className="song-analytics-list">
                        {platformAnalytics.mostPlayedSongs.map((song, idx) => (
                          <div key={song._id || idx} className="song-analytics-item">
                            <div className="item-left">
                              <span className={`rank-badge top-${idx + 1}`}>{idx + 1}</span>
                              <div className="song-meta">
                                <span className="title">{song.title}</span>
                                <span className="artist">{song.artist}</span>
                              </div>
                            </div>
                            <span className="metric-pill">▶ {song.playCount} plays</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No play data recorded.</p>
                    )}
                  </div>

                  {/* Most Liked Songs */}
                  <div className="analytics-panel">
                    <h4>❤️ Most Liked Songs (Platform-Wide)</h4>
                    {platformAnalytics.mostLikedSongs?.length > 0 ? (
                      <div className="song-analytics-list">
                        {platformAnalytics.mostLikedSongs.map((song, idx) => (
                          <div key={song._id || idx} className="song-analytics-item">
                            <div className="item-left">
                              <span className="rank-badge">❤️</span>
                              <div className="song-meta">
                                <span className="title">{song.title}</span>
                                <span className="artist">{song.artist}</span>
                              </div>
                            </div>
                            <span className="metric-pill liked">{song.likeCount} likes</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No liked songs recorded.</p>
                    )}
                  </div>
                </div>

                <div className="cards-grid-2">
                  {/* Most Skipped Songs */}
                  <div className="analytics-panel">
                    <h4>⏭️ Most Skipped Songs</h4>
                    {platformAnalytics.mostSkippedSongs?.length > 0 ? (
                      <div className="song-analytics-list">
                        {platformAnalytics.mostSkippedSongs.map((song, idx) => (
                          <div key={song._id || idx} className="song-analytics-item">
                            <div className="item-left">
                              <span className="rank-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}>
                                ⏭️
                              </span>
                              <div className="song-meta">
                                <span className="title">{song.title}</span>
                                <span className="artist">{song.artist}</span>
                              </div>
                            </div>
                            <span className="metric-pill skip">{song.skipCount} skips</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No skip data recorded.</p>
                    )}
                  </div>

                  {/* Overall Mood Distribution */}
                  <div className="analytics-panel">
                    <h4>🎭 Overall Platform Mood Distribution</h4>
                    {platformAnalytics.moodDistribution?.length > 0 ? (
                      <div className="mood-dist-list">
                        {platformAnalytics.moodDistribution.map((m) => {
                          const emoName = m.mood.toLowerCase();
                          return (
                            <div key={m.mood} className="mood-dist-item">
                              <div className="mood-dist-row">
                                <span className={`mood-badge-inline ${emoName}`}>
                                  {EMOJI_MAP[emoName] || '😐'} <span style={{ textTransform: 'capitalize' }}>{m.mood}</span>
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
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No mood scans recorded across platform.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL 1: UPLOAD SONG */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className="modal-header">
                <h3>➕ Upload New Track</h3>
                <button className="close-btn" onClick={() => setShowUploadModal(false)}>✕</button>
              </div>
              <form onSubmit={handleUploadSubmit}>
                <div className="admin-form-group">
                  <label>Audio File (.mp3 / .wav / .ogg)*</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setUploadForm({ ...uploadForm, audioFile: e.target.files[0] })}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label>Track Title*</label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label>Artist Name*</label>
                  <input
                    type="text"
                    value={uploadForm.artist}
                    onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="admin-form-group">
                    <label>Genre</label>
                    <input
                      type="text"
                      value={uploadForm.genre}
                      onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Language</label>
                    <input
                      type="text"
                      value={uploadForm.language}
                      onChange={(e) => setUploadForm({ ...uploadForm, language: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="admin-form-group">
                    <label>Target Mood</label>
                    <select
                      value={uploadForm.mood}
                      onChange={(e) => setUploadForm({ ...uploadForm, mood: e.target.value })}
                    >
                      <option value="happy">😊 Happy</option>
                      <option value="sad">😢 Sad</option>
                      <option value="angry">😠 Angry</option>
                      <option value="neutral">😐 Neutral</option>
                      <option value="surprised">😮 Surprised</option>
                      <option value="fearful">😨 Fearful</option>
                      <option value="disgusted">🤢 Disgusted</option>
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Energy (0-100): {uploadForm.energy}</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={uploadForm.energy}
                      onChange={(e) => setUploadForm({ ...uploadForm, energy: e.target.value })}
                    />
                  </div>
                </div>
                <div className="admin-form-group">
                  <label>Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="chill, electronic, pop"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
                  <button type="submit" className="action-btn-primary" disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload Track'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EDIT SONG METADATA */}
      <AnimatePresence>
        {editingSong && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className="modal-header">
                <h3>✏️ Edit Song Metadata</h3>
                <button className="close-btn" onClick={() => setEditingSong(null)}>✕</button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="admin-form-group">
                  <label>Track Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label>Artist Name</label>
                  <input
                    type="text"
                    value={editForm.artist}
                    onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="admin-form-group">
                    <label>Genre</label>
                    <input
                      type="text"
                      value={editForm.genre}
                      onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Language</label>
                    <input
                      type="text"
                      value={editForm.language}
                      onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="admin-form-group">
                    <label>Target Mood</label>
                    <select
                      value={editForm.mood}
                      onChange={(e) => setEditForm({ ...editForm, mood: e.target.value })}
                    >
                      <option value="happy">😊 Happy</option>
                      <option value="sad">😢 Sad</option>
                      <option value="angry">😠 Angry</option>
                      <option value="neutral">😐 Neutral</option>
                      <option value="surprised">😮 Surprised</option>
                      <option value="fearful">😨 Fearful</option>
                      <option value="disgusted">🤢 Disgusted</option>
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Energy (0-100): {editForm.energy}</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editForm.energy}
                      onChange={(e) => setEditForm({ ...editForm, energy: e.target.value })}
                    />
                  </div>
                </div>
                <div className="admin-form-group">
                  <label>Tags (comma separated)</label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setEditingSong(null)}>Cancel</button>
                  <button type="submit" className="action-btn-primary">Save Metadata</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 3: VIEW USER STATISTICS */}
      <AnimatePresence>
        {showStatsModal && selectedUserStats && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className="modal-header">
                <h3>📊 User Statistics: {selectedUserStats.user?.name}</h3>
                <button className="close-btn" onClick={() => setShowStatsModal(false)}>✕</button>
              </div>
              <div>
                <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Email: {selectedUserStats.user?.email} • Role: {selectedUserStats.user?.role}
                </p>

                <div className="overview-stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="summary-card" style={{ padding: '1rem' }}>
                    <div className="summary-info">
                      <span className="label">Total Plays</span>
                      <span className="val">{selectedUserStats.stats?.totalPlays || 0}</span>
                    </div>
                  </div>

                  <div className="summary-card" style={{ padding: '1rem' }}>
                    <div className="summary-info">
                      <span className="label">Listening Time</span>
                      <span className="val">{formatDuration(selectedUserStats.stats?.totalListeningSeconds)}</span>
                    </div>
                  </div>

                  <div className="summary-card" style={{ padding: '1rem' }}>
                    <div className="summary-info">
                      <span className="label">Liked Songs</span>
                      <span className="val">{selectedUserStats.stats?.likedCount || 0}</span>
                    </div>
                  </div>

                  <div className="summary-card" style={{ padding: '1rem' }}>
                    <div className="summary-info">
                      <span className="label">Dominant Mood</span>
                      <span className="val" style={{ textTransform: 'capitalize' }}>
                        {selectedUserStats.stats?.dominantMood || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="action-btn-primary" onClick={() => setShowStatsModal(false)}>Close</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminDashboard;
