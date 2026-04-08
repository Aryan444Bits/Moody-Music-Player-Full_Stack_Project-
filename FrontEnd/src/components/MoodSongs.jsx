import React from "react";
import "./MoodSongs.css"
import { useState } from "react";
import { motion, AnimatePresence } from 'framer-motion';

const MoodSongs = ({Songs, loading, mood}) => {

const [isplaying, setIsPlaying] = useState(null);

const handlePlayPause = (index) => {
    if (isplaying === index) { 
        setIsPlaying(null); 
    }else {
        setIsPlaying(index);        
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
                            {Songs.length > 0 ? Songs.map((song, index) => (
                                <motion.div 
                                    key={index}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="song-item"
                                >
                                    <div className="title">
                                        <p>{song.artist}</p>
                                        <audio src={song.audio} controls></audio>
                                    </div>
                                </motion.div>
                            )) : (
                                <p className="placeholder">Scan your face to see song recommendations</p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

export default MoodSongs