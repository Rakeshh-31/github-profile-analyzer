-- ============================================================
-- GitHub Profile Analyzer — Database Schema
-- ============================================================

-- Create the database (run this once)
CREATE DATABASE IF NOT EXISTS github_analyzer
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE github_analyzer;

-- ── Main table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS github_profiles (
  id                      INT AUTO_INCREMENT PRIMARY KEY,

  -- Basic Profile Info
  username                VARCHAR(100) NOT NULL UNIQUE,
  name                    VARCHAR(255),
  bio                     TEXT,
  avatar_url              VARCHAR(500),
  location                VARCHAR(255),
  blog                    VARCHAR(500),
  email                   VARCHAR(255),

  -- GitHub Stats
  public_repos            INT DEFAULT 0,
  followers               INT DEFAULT 0,
  following               INT DEFAULT 0,

  -- Computed Insights
  total_stars             INT DEFAULT 0        COMMENT 'Sum of stars across all repos',
  total_forks             INT DEFAULT 0        COMMENT 'Sum of forks across all repos',
  top_language            VARCHAR(100)         COMMENT 'Most frequently used language',
  language_breakdown      JSON                 COMMENT 'JSON map of language => repo count',
  most_starred_repo       VARCHAR(255)         COMMENT 'Name of the most starred repository',
  most_starred_repo_stars INT DEFAULT 0,
  avg_repo_size_kb        INT DEFAULT 0        COMMENT 'Average repo size in kilobytes',
  recently_active_repos   INT DEFAULT 0        COMMENT 'Repos with activity in last 30 days',
  open_source_score       INT DEFAULT 0        COMMENT 'Percentage of non-forked repos (0-100)',
  account_age_days        INT DEFAULT 0        COMMENT 'How old the GitHub account is in days',

  -- Timestamps
  github_created_at       DATETIME,
  github_updated_at       DATETIME,
  analyzed_at             DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'When our API last analyzed this profile',

  -- Indexes for fast lookups
  INDEX idx_username      (username),
  INDEX idx_top_language  (top_language),
  INDEX idx_followers     (followers),
  INDEX idx_analyzed_at   (analyzed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
