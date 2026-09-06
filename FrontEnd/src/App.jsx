import React, { useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Home from './components/Home';
import UploadSong from './components/UploadSong';
import Suggestion from './components/Suggestion';
import ListeningHistory from './components/ListeningHistory';
import MoodHistory from './components/MoodHistory';
import MoodJourney from './components/MoodJourney';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, AuthContext } from './context/AuthContext';
import './App.css';

const Navigation = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="main-nav">
      <Link to="/">Home</Link>
      <Link to="/suggestion">Mood Suggestions</Link>
      <Link to="/upload">Upload Song</Link>
      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '1rem' }}>
          <Link to="/history">Listening History</Link>
          <Link to="/mood-history">Mood History</Link>
          <Link to="/mood-journey">Mood Journey</Link>
          <span style={{ fontSize: '0.9rem', color: '#b26cff', fontWeight: 'bold' }}>
            👤 {user.name}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.85rem',
              marginTop: 0,
              background: 'rgba(255, 77, 77, 0.2)',
              border: '1px solid rgba(255, 77, 77, 0.4)',
              color: '#ff6b6b'
            }}
          >
            Logout
          </button>
        </div>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
};

function AppContent() {
  const [Songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState(null);

  return (
    <Router>
      <Navigation />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadSong />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <ListeningHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mood-history"
          element={
            <ProtectedRoute>
              <MoodHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mood-journey"
          element={
            <ProtectedRoute>
              <MoodJourney />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suggestion"
          element={
            <ProtectedRoute>
              <Suggestion
                Songs={Songs}
                setSongs={setSongs}
                loading={loading}
                setLoading={setLoading}
                mood={mood}
                setMood={setMood}
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
