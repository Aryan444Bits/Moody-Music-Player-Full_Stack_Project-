import React from "react";
import "./MoodSongs.css"
import { useState } from "react";

const MoodSongs = ({Songs}) => {

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
            <h2>Recomended Songs</h2>

            {Songs.map((song, index) => (
                <div key={index}>
                    <div className="title">
                        <p>{song.artist}</p>
                        <audio src={song.audio} controls></audio>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default MoodSongs