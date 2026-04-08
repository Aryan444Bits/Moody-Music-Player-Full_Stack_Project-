import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import './UploadSong.css';

const UploadSong = () => {
    const [formData, setFormData] = useState({
        title: '',
        artist: '',
        mood: 'happy',
        audio: null
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleFileChange = (e) => {
        setFormData({ ...formData, audio: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.audio) return alert("Please select an audio file");

        setLoading(true);
        const data = new FormData();
        data.append('title', formData.title);
        data.append('artist', formData.artist);
        data.append('mood', formData.mood);
        data.append('audio', formData.audio);

        try {
            const res = await axios.post('http://localhost:3000/songs', data);
            setMessage("Song uploaded successfully!");
            setFormData({ title: '', artist: '', mood: 'happy', audio: null });
        } catch (err) {
            console.error(err);
            setMessage("Error uploading song");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div 
            className="upload-page"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
        >
            <h2>Upload New <span className="span-elem">Song</span></h2>
            <form onSubmit={handleSubmit} className="upload-form">
                <input 
                    type="text" 
                    placeholder="Song Title" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required 
                />
                <input 
                    type="text" 
                    placeholder="Artist Name" 
                    value={formData.artist}
                    onChange={(e) => setFormData({...formData, artist: e.target.value})}
                    required 
                />
                <select 
                    value={formData.mood}
                    onChange={(e) => setFormData({...formData, mood: e.target.value})}
                >
                    <option value="happy">Happy</option>
                    <option value="sad">Sad</option>
                    <option value="angry">Angry</option>
                    <option value="surprised">Surprised</option>
                    <option value="neutral">Neutral</option>
                </select>
                <div className="file-input">
                    <label>Audio File (MP3):</label>
                    <input type="file" accept="audio/*" onChange={handleFileChange} required />
                </div>
                <motion.button 
                    type="submit" 
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {loading ? "Uploading..." : "Upload Song"}
                </motion.button>
            </form>
            {message && <p className="upload-message">{message}</p>}
        </motion.div>
    );
};

export default UploadSong;
