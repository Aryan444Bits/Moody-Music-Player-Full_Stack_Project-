import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/sessions';

export const getSessionId = () => {
  let sid = sessionStorage.getItem('moody_session_id');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    sessionStorage.setItem('moody_session_id', sid);
  }
  return sid;
};

export const startNewSession = async (token) => {
  const newSid = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  sessionStorage.setItem('moody_session_id', newSid);

  if (token) {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_BASE_URL}/start`, { sessionId: newSid }, config);
    } catch (err) {
      console.error('Error auto-starting session on backend:', err);
    }
  }

  return newSid;
};

export const endActiveSession = async (token) => {
  const currentSid = sessionStorage.getItem('moody_session_id');
  if (token && currentSid) {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_BASE_URL}/end`, { sessionId: currentSid }, config);
    } catch (err) {
      console.error('Error ending active session on backend:', err);
    }
  }
  return currentSid;
};
