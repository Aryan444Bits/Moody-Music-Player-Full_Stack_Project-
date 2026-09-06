const express = require('express');
const router = express.Router();
const {
  recordMood,
  getMoodHistory,
  deleteMoodHistory
} = require('../controllers/mood.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.route('/')
  .post(recordMood)
  .get(getMoodHistory)
  .delete(deleteMoodHistory);

router.delete('/:id', deleteMoodHistory);

module.exports = router;
