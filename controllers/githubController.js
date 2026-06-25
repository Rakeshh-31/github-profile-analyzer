const axios = require('axios');
const pool = require('../config/db');
require('dotenv').config();

// Build GitHub API headers (uses token if available for higher rate limit)
const getGithubHeaders = () => {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/analyze/:username
// Fetches GitHub profile data, computes insights, and stores them in MySQL
// ─────────────────────────────────────────────────────────────────────────────
const analyzeProfile = async (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ success: false, message: 'Username is required' });
  }

  try {
    const headers = getGithubHeaders();

    // 1. Fetch basic profile data
    const profileRes = await axios.get(`https://api.github.com/users/${username}`, { headers });
    const profile = profileRes.data;

    // 2. Fetch all repositories (paginated — up to 100)
    const reposRes = await axios.get(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
      { headers }
    );
    const repos = reposRes.data;

    // ── Compute Insights ────────────────────────────────────────────────────

    // Language breakdown
    const languageCount = {};
    repos.forEach(repo => {
      if (repo.language) {
        languageCount[repo.language] = (languageCount[repo.language] || 0) + 1;
      }
    });
    const topLanguage = Object.keys(languageCount).sort(
      (a, b) => languageCount[b] - languageCount[a]
    )[0] || null;

    // Star & fork totals
    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
    const totalForks = repos.reduce((sum, r) => sum + r.forks_count, 0);

    // Most starred repo
    const mostStarredRepo = repos.reduce(
      (best, r) => (r.stargazers_count > (best?.stargazers_count || 0) ? r : best),
      null
    );

    // Repo size average (KB)
    const avgRepoSize =
      repos.length > 0
        ? Math.round(repos.reduce((sum, r) => sum + r.size, 0) / repos.length)
        : 0;

    // Recently updated repos (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentlyActiveRepos = repos.filter(
      r => new Date(r.pushed_at) > thirtyDaysAgo
    ).length;

    // Open source score: % of non-forked repos
    const originalRepos = repos.filter(r => !r.fork).length;
    const openSourceScore =
      repos.length > 0 ? Math.round((originalRepos / repos.length) * 100) : 0;

    // Account age in days
    const accountCreatedAt = new Date(profile.created_at);
    const accountAgeDays = Math.floor(
      (Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // ── Store in MySQL ───────────────────────────────────────────────────────
    const conn = await pool.getConnection();
    try {
      // Upsert: update if username already exists
      const [result] = await conn.execute(
        `INSERT INTO github_profiles (
          username, name, bio, avatar_url, location, blog, email,
          public_repos, followers, following,
          total_stars, total_forks,
          top_language, language_breakdown,
          most_starred_repo, most_starred_repo_stars,
          avg_repo_size_kb, recently_active_repos,
          open_source_score, account_age_days,
          github_created_at, github_updated_at, analyzed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          name                  = VALUES(name),
          bio                   = VALUES(bio),
          avatar_url            = VALUES(avatar_url),
          location              = VALUES(location),
          blog                  = VALUES(blog),
          email                 = VALUES(email),
          public_repos          = VALUES(public_repos),
          followers             = VALUES(followers),
          following             = VALUES(following),
          total_stars           = VALUES(total_stars),
          total_forks           = VALUES(total_forks),
          top_language          = VALUES(top_language),
          language_breakdown    = VALUES(language_breakdown),
          most_starred_repo     = VALUES(most_starred_repo),
          most_starred_repo_stars = VALUES(most_starred_repo_stars),
          avg_repo_size_kb      = VALUES(avg_repo_size_kb),
          recently_active_repos = VALUES(recently_active_repos),
          open_source_score     = VALUES(open_source_score),
          account_age_days      = VALUES(account_age_days),
          github_created_at     = VALUES(github_created_at),
          github_updated_at     = VALUES(github_updated_at),
          analyzed_at           = NOW()`,
        [
          profile.login,
          profile.name,
          profile.bio,
          profile.avatar_url,
          profile.location,
          profile.blog,
          profile.email,
          profile.public_repos,
          profile.followers,
          profile.following,
          totalStars,
          totalForks,
          topLanguage,
          JSON.stringify(languageCount),
          mostStarredRepo?.name || null,
          mostStarredRepo?.stargazers_count || 0,
          avgRepoSize,
          recentlyActiveRepos,
          openSourceScore,
          accountAgeDays,
          new Date(profile.created_at),
          new Date(profile.updated_at),
        ]
      );
      conn.release();

      const savedProfile = {
        username: profile.login,
        name: profile.name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        location: profile.location,
        blog: profile.blog,
        email: profile.email,
        public_repos: profile.public_repos,
        followers: profile.followers,
        following: profile.following,
        insights: {
          total_stars: totalStars,
          total_forks: totalForks,
          top_language: topLanguage,
          language_breakdown: languageCount,
          most_starred_repo: mostStarredRepo?.name || null,
          most_starred_repo_stars: mostStarredRepo?.stargazers_count || 0,
          avg_repo_size_kb: avgRepoSize,
          recently_active_repos: recentlyActiveRepos,
          open_source_score: `${openSourceScore}%`,
          account_age_days: accountAgeDays,
        },
        github_created_at: profile.created_at,
        analyzed_at: new Date().toISOString(),
      };

      return res.status(200).json({
        success: true,
        message: `Profile for "${username}" analyzed and stored successfully`,
        data: savedProfile,
      });
    } catch (dbErr) {
      conn.release();
      throw dbErr;
    }
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ success: false, message: `GitHub user "${username}" not found` });
    }
    if (err.response?.status === 403) {
      return res.status(429).json({ success: false, message: 'GitHub API rate limit exceeded. Add a GITHUB_TOKEN in .env to increase the limit.' });
    }
    console.error("========== FULL ERROR ==========");
    console.error(err);
    console.error("Message:", err.message);
    console.error("Code:", err.code);
    console.error("SQL Message:", err.sqlMessage);
    console.error("Response:", err.response?.data);
    console.error("================================");
    return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/profiles
// Returns all stored analyzed profiles
// ─────────────────────────────────────────────────────────────────────────────
const getAllProfiles = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
        id, username, name, bio, avatar_url, location,
        public_repos, followers, following,
        total_stars, total_forks, top_language,
        most_starred_repo, most_starred_repo_stars,
        recently_active_repos, open_source_score,
        account_age_days, analyzed_at
       FROM github_profiles
       ORDER BY analyzed_at DESC`
    );

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error('getAllProfiles error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/profiles/:username
// Returns stored data for a single profile
// ─────────────────────────────────────────────────────────────────────────────
const getProfileByUsername = async (req, res) => {
  const { username } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT * FROM github_profiles WHERE username = ?`,
      [username]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No analyzed data found for "${username}". Use POST /api/analyze/${username} first.`,
      });
    }

    const profile = rows[0];
    // Parse JSON field back to object
    if (typeof profile.language_breakdown === 'string') {
        try {
            profile.language_breakdown = JSON.parse(profile.language_breakdown);
        } catch {
            profile.language_breakdown = {};
  }
}

    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    console.error('getProfileByUsername error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/profiles/:username  (bonus feature)
// Removes a profile from the database
// ─────────────────────────────────────────────────────────────────────────────
const deleteProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const [result] = await pool.execute(
      `DELETE FROM github_profiles WHERE username = ?`,
      [username]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: `Profile "${username}" not found` });
    }

    return res.status(200).json({ success: true, message: `Profile "${username}" deleted successfully` });
  } catch (err) {
    console.error('deleteProfile error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

module.exports = { analyzeProfile, getAllProfiles, getProfileByUsername, deleteProfile };
