import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './components/Home';
import UploadSong from './components/UploadSong';
import Suggestion from './components/Suggestion';
import './App.css';

function App() {
  const [Songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState(null);

  return (
    <Router>
      <nav className="main-nav">
        <Link to="/">Home</Link>
        <Link to="/suggestion">Mood Suggestions</Link>
        <Link to="/upload">Upload Song</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<UploadSong />} />
        <Route path="/suggestion" element={
          <Suggestion 
            Songs={Songs} setSongs={setSongs} 
            loading={loading} setLoading={setLoading} 
            mood={mood} setMood={setMood} 
          />
        } />
      </Routes>
    </Router>
  );
}

export default App;

