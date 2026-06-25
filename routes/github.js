const express = require('express');
const router = express.Router();
const {
  analyzeProfile,
  getAllProfiles,
  getProfileByUsername,
  deleteProfile,
} = require('../controllers/githubController');

// ── Analyze & Store ─────────────────────────────────────────────────────────
// POST /api/analyze/:username
// Fetches GitHub data, computes insights, stores in MySQL
router.post('/analyze/:username', analyzeProfile);

// ── Fetch Stored Profiles ───────────────────────────────────────────────────
// GET /api/profiles           → all stored profiles
// GET /api/profiles/:username → single stored profile
router.get('/profiles', getAllProfiles);
router.get('/profiles/:username', getProfileByUsername);

// ── Delete a Profile (Bonus) ────────────────────────────────────────────────
// DELETE /api/profiles/:username
router.delete('/profiles/:username', deleteProfile);

module.exports = router;
