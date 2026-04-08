import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Home = () => {
    const features = [
        { icon: "🎨", title: "Visual Recognition", desc: "Our AI scans 68 facial points to pinpoint your exact emotion in real-time." },
        { icon: "🎵", title: "Smart Curation", desc: "Automatically matches your current vibe with the perfect acoustic selection." },
        { icon: "☁️", title: "Cloud Library", desc: "Upload your favorite tracks and let the engine categorize them for you." }
    ];

    const stats = [
        { label: "Moods Tracked", value: "7+" },
        { label: "AI Accuracy", value: "98%" },
        { label: "Fast Loading", value: "<1s" }
    ];

    return (
        <div className="home-wrapper">
            <motion.div 
                className="home-page"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
            >
                <div className="hero-section">
                    <motion.div 
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <span className="hero-badge">AI-POWERED EXPERIENCE</span>
                        <h1>Music that <span className="span-elem">Feels</span> Like You</h1>
                        <p className="hero-subtitle">Stop searching. Start feeling. Let our advanced facial recognition technology find the perfect soundtrack for your current state of mind.</p>
                        
                        <div className="home-actions">
                            <Link to="/suggestion">
                                <motion.button 
                                    className="primary-btn"
                                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(178, 108, 255, 0.6)" }} 
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Launch Player
                                </motion.button>
                            </Link>
                            <Link to="/upload">
                                <motion.button className="secondary-btn" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    Contribute Music
                                </motion.button>
                            </Link>
                        </div>
                    </motion.div>
                </div>

                <div className="features-grid">
                    {features.map((f, i) => (
                        <motion.div 
                            key={i}
                            className="feature-card"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + (i * 0.1) }}
                            whileHover={{ y: -10 }}
                        >
                            <div className="feature-icon">{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </motion.div>
                    ))}
                </div>

                <div className="stats-section">
                    {stats.map((s, i) => (
                        <motion.div 
                            key={i}
                            className="stat-item"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 + (i * 0.1) }}
                        >
                            <h4>{s.value}</h4>
                            <span>{s.label}</span>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default Home;

