require('dotenv').config();
require('./config/db');
const express = require('express');
const cors = require('cors');
const githubRoutes = require('./routes/github');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 GitHub Profile Analyzer API is running',
    version: '1.0.0',
    endpoints: {
      analyze:        'POST   /api/analyze/:username  → Fetch & store GitHub profile',
      allProfiles:    'GET    /api/profiles           → List all stored profiles',
      singleProfile:  'GET    /api/profiles/:username → Get one stored profile',
      deleteProfile:  'DELETE /api/profiles/:username → Remove a stored profile',
    },
  });
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', githubRoutes);

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 GitHub Profile Analyzer API`);
  console.log(`   Server running at: http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop\n`);
});
