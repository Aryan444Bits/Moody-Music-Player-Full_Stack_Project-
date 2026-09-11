import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './UploadSong.css';

const API_BASE_URL = 'http://localhost:3000';

const UploadSong = () => {
    const { token } = useContext(AuthContext);

    const [formData, setFormData] = useState({
        title: '',
        artist: '',
        description: '',
        mood: 'happy',
        genre: 'Pop',
        language: 'English',
        energy: 50,
        tags: '',
        duration: '',
        audio: null
    });

    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState(null);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handleFileChange = (e) => {
        setFormData({ ...formData, audio: e.target.files[0] });
    };

    // Trigger AI Metadata Suggestion based on textual details
    const handleSuggestMetadata = async () => {
        if (!formData.title && !formData.artist && !formData.description) {
            alert('Please enter at least a song title, artist, or description notes to get AI metadata suggestions.');
            return;
        }

        setAiLoading(true);
        setMessage('');

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.post(
                `${API_BASE_URL}/api/ai/suggest-metadata`,
                {
                    title: formData.title,
                    artist: formData.artist,
                    language: formData.language,
                    description: formData.description
                },
                config
            );

            if (response.data && response.data.success) {
                setAiSuggestions(response.data.suggestions);
            }
        } catch (err) {
            console.error('Error fetching AI metadata suggestions:', err);
            alert(err.response?.data?.message || 'Failed to generate AI metadata suggestions');
        } finally {
            setAiLoading(false);
        }
    };

    // Apply AI suggestions to form inputs
    const handleAcceptSuggestions = () => {
        if (!aiSuggestions) return;

        setFormData((prev) => ({
            ...prev,
            mood: aiSuggestions.mood || prev.mood,
            genre: aiSuggestions.genre || prev.genre,
            language: aiSuggestions.language || prev.language,
            energy: aiSuggestions.energy !== undefined ? aiSuggestions.energy : prev.energy,
            tags: Array.isArray(aiSuggestions.tags) ? aiSuggestions.tags.join(', ') : prev.tags
        }));

        setAiSuggestions(null);
        setMessage('AI metadata suggestions applied to form! Review and submit when ready. ✨');
        setIsError(false);
    };

    const handleRejectSuggestions = () => {
        setAiSuggestions(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.audio) return alert("Please select an audio file");

        setLoading(true);
        setMessage('');
        setIsError(false);

        const data = new FormData();
        data.append('title', formData.title);
        data.append('artist', formData.artist);
        data.append('mood', formData.mood);
        data.append('genre', formData.genre);
        data.append('language', formData.language);
        data.append('energy', formData.energy);
        data.append('tags', formData.tags);
        if (formData.duration) {
            data.append('duration', formData.duration);
        }
        data.append('audio', formData.audio);

        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            };

            await axios.post(`${API_BASE_URL}/songs`, data, config);
            setMessage("Song uploaded successfully with rich metadata! 🎉");
            setFormData({
                title: '',
                artist: '',
                description: '',
                mood: 'happy',
                genre: 'Pop',
                language: 'English',
                energy: 50,
                tags: '',
                duration: '',
                audio: null
            });
            setAiSuggestions(null);
        } catch (err) {
            console.error(err);
            setIsError(true);
            setMessage(err.response?.data?.message || "Error uploading song");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div 
            className="upload-page"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <h2>Upload New <span className="span-elem">Song</span></h2>
            <p className="upload-subtitle">Add track details, optional vibe notes, and AI-assisted metadata</p>

            <form onSubmit={handleSubmit} className="upload-form">
                <div className="form-group-row">
                    <div className="input-field">
                        <label>Song Title *</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Midnight Waves" 
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            required 
                        />
                    </div>
                    <div className="input-field">
                        <label>Artist Name *</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Lunar Echoes" 
                            value={formData.artist}
                            onChange={(e) => setFormData({...formData, artist: e.target.value})}
                            required 
                        />
                    </div>
                </div>

                {/* Track Vibe / Description Notes for AI */}
                <div className="input-field full-width">
                    <label>Track Vibe / Description Notes (Optional for AI Metadata)</label>
                    <textarea
                        className="upload-textarea"
                        placeholder="e.g. 'Chill acoustic Hindi song with soft piano, good for studying and relaxing late at night...'"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={2}
                    />
                </div>

                {/* AI Metadata Trigger Button */}
                <div className="ai-suggest-bar">
                    <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSuggestMetadata}
                        disabled={aiLoading || (!formData.title && !formData.artist && !formData.description)}
                        className="ai-suggest-btn"
                    >
                        {aiLoading ? (
                            <span className="btn-spinner-content">
                                <span className="mini-spinner" /> Analyzing Text Details...
                            </span>
                        ) : (
                            <span>✨ Suggest Metadata with AI</span>
                        )}
                    </motion.button>
                    <span className="ai-note-hint">
                        💡 OpenRouter analyzes title, artist & description notes to suggest mood, genre, energy & tags.
                    </span>
                </div>

                {/* AI Suggestions Approval Preview Card */}
                <AnimatePresence>
                    {aiSuggestions && (
                        <motion.div
                            className="ai-suggestions-card"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <div className="card-header">
                                <span className="card-badge">✨ Proposed AI Metadata Suggestions</span>
                                <p className="card-disclaimer">Note: Generated purely from provided text details. Review before accepting.</p>
                            </div>

                            <div className="suggestions-grid">
                                <div className="sugg-item">
                                    <span className="sugg-label">Mood:</span>
                                    <span className="sugg-val mood-val">{aiSuggestions.mood}</span>
                                </div>

                                <div className="sugg-item">
                                    <span className="sugg-label">Genre:</span>
                                    <span className="sugg-val genre-val">{aiSuggestions.genre}</span>
                                </div>

                                <div className="sugg-item">
                                    <span className="sugg-label">Language:</span>
                                    <span className="sugg-val lang-val">{aiSuggestions.language}</span>
                                </div>

                                <div className="sugg-item">
                                    <span className="sugg-label">Energy Level:</span>
                                    <span className="sugg-val energy-val">{aiSuggestions.energy}%</span>
                                </div>

                                <div className="sugg-item full">
                                    <span className="sugg-label">Tags:</span>
                                    <span className="sugg-val tags-val">
                                        {Array.isArray(aiSuggestions.tags) ? aiSuggestions.tags.map(t => `#${t}`).join(' ') : 'None'}
                                    </span>
                                </div>
                            </div>

                            <div className="approval-actions">
                                <button type="button" onClick={handleAcceptSuggestions} className="btn-accept">
                                    ✅ Accept Suggestions
                                </button>
                                <button type="button" onClick={handleAcceptSuggestions} className="btn-edit">
                                    ✏️ Edit & Apply
                                </button>
                                <button type="button" onClick={handleRejectSuggestions} className="btn-reject">
                                    ❌ Reject
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="form-group-row">
                    <div className="input-field">
                        <label>Primary Mood</label>
                        <select 
                            value={formData.mood}
                            onChange={(e) => setFormData({...formData, mood: e.target.value})}
                        >
                            <option value="happy">Happy 😊</option>
                            <option value="sad">Sad 😢</option>
                            <option value="angry">Angry 😡</option>
                            <option value="surprised">Surprised 😲</option>
                            <option value="neutral">Neutral 😐</option>
                            <option value="relaxed">Relaxed 😌</option>
                            <option value="energetic">Energetic ⚡</option>
                            <option value="chill">Chill 🎧</option>
                        </select>
                    </div>

                    <div className="input-field">
                        <label>Genre</label>
                        <select 
                            value={formData.genre}
                            onChange={(e) => setFormData({...formData, genre: e.target.value})}
                        >
                            <option value="Pop">Pop</option>
                            <option value="Rock">Rock</option>
                            <option value="Hip-Hop">Hip-Hop</option>
                            <option value="R&B">R&B</option>
                            <option value="Electronic">Electronic</option>
                            <option value="Acoustic">Acoustic</option>
                            <option value="Ambient">Ambient</option>
                            <option value="Classical">Classical</option>
                            <option value="Jazz">Jazz</option>
                            <option value="Lo-Fi">Lo-Fi</option>
                            <option value="Indie">Indie</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="form-group-row">
                    <div className="input-field">
                        <label>Language</label>
                        <select 
                            value={formData.language}
                            onChange={(e) => setFormData({...formData, language: e.target.value})}
                        >
                            <option value="English">English</option>
                            <option value="Spanish">Spanish</option>
                            <option value="Hindi">Hindi</option>
                            <option value="French">French</option>
                            <option value="Japanese">Japanese</option>
                            <option value="German">German</option>
                            <option value="Instrumental">Instrumental</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="input-field">
                        <label>Energy Level ({formData.energy}%)</label>
                        <div className="slider-container">
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={formData.energy}
                                onChange={(e) => setFormData({...formData, energy: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-group-row">
                    <div className="input-field">
                        <label>Tags (comma separated)</label>
                        <input 
                            type="text" 
                            placeholder="e.g. lofi, chill, focus, summer" 
                            value={formData.tags}
                            onChange={(e) => setFormData({...formData, tags: e.target.value})}
                        />
                    </div>

                    <div className="input-field">
                        <label>Duration (seconds, optional)</label>
                        <input 
                            type="number" 
                            placeholder="e.g. 215" 
                            min="0"
                            value={formData.duration}
                            onChange={(e) => setFormData({...formData, duration: e.target.value})}
                        />
                    </div>
                </div>

                <div className="file-input">
                    <label>Audio File (MP3 / WAV):</label>
                    <input type="file" accept="audio/*" onChange={handleFileChange} required />
                </div>

                <motion.button 
                    type="submit" 
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="submit-upload-btn"
                >
                    {loading ? "Uploading to Cloud..." : "Upload Song"}
                </motion.button>
            </form>

            {message && (
                <p className={`upload-message ${isError ? 'error-msg' : 'success-msg'}`}>
                    {message}
                </p>
            )}
        </motion.div>
    );
};

export default UploadSong;
