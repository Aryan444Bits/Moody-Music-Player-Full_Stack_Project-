const express = require('express');
const router = express.Router();
const {
  startSession,
  endSession,
  getSession,
  getRecentSessions
} = require('../controllers/session.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/start', startSession);
router.post('/end', endSession);
router.post('/:sessionId/end', endSession);

router.get('/', getRecentSessions);
router.get('/:id', getSession);

module.exports = router;
