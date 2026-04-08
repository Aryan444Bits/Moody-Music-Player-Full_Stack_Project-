import React from 'react';
import FacialExpression from './FacialExpression';
import MoodSongs from './MoodSongs';
import { motion } from 'framer-motion';

const Suggestion = ({ Songs, setSongs, loading, setLoading, mood, setMood }) => {
    return (
        <motion.div 
            className="main-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <FacialExpression setSongs={setSongs} setLoading={setLoading} setMood={setMood} />
            <MoodSongs Songs={Songs} loading={loading} mood={mood} />
        </motion.div>
    );
};

export default Suggestion;
