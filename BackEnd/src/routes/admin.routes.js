const express = require('express');
const multer = require('multer');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getAdminOverview,
  getAdminSongs,
  uploadAdminSong,
  updateAdminSong,
  deleteAdminSong,
  getAdminUsers,
  getUserStats,
  toggleUserStatus,
  updateUserRole,
  deleteAdminUser,
  getAdminAnalytics
} = require('../controllers/admin.controller');

const upload = multer({ storage: multer.memoryStorage() });

// STRICT BACKEND AUTHORIZATION: Protect all admin routes with JWT auth & Admin Role requirement
router.use(protect);
router.use(authorize('admin'));

// Overview
router.get('/overview', getAdminOverview);

// Song Management APIs
router.get('/songs', getAdminSongs);
router.post('/songs', upload.single('audio'), uploadAdminSong);
router.put('/songs/:id', updateAdminSong);
router.delete('/songs/:id', deleteAdminSong);

// User Management APIs
router.get('/users', getAdminUsers);
router.get('/users/:id/stats', getUserStats);
router.put('/users/:id/status', toggleUserStatus);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteAdminUser);

// Platform Analytics API
router.get('/analytics', getAdminAnalytics);

module.exports = router;
