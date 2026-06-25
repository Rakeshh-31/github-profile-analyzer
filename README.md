# GitHub Profile Analyzer API

A backend service built with **Node.js + Express + MySQL** that analyzes GitHub user profiles using the GitHub Public API and stores rich insights in a MySQL database.

---

## Tech Stack
- **Node.js** — Runtime
- **Express.js** — Web framework
- **MySQL** — Database (via `mysql2`)
- **GitHub Public API** — Third-party data source
- **axios** — HTTP client
- **dotenv** — Environment variable management

---

## Features
- Fetch public profile data from GitHub using a username
- Compute and store useful insights:
  - Total stars & forks across all repos
  - Top programming language
  - Full language breakdown (JSON)
  - Most starred repository
  - Recently active repos (last 30 days)
  - Open source score (% of original vs forked repos)
  - Account age in days
- Store all analysis results in MySQL (with upsert — re-analyzing updates the record)
- API to fetch all stored profiles
- API to fetch data of a single profile
- Bonus: API to delete a stored profile

---

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/github-profile-analyzer.git
cd github-profile-analyzer
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env` with your values:
```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=github_analyzer
GITHUB_TOKEN=your_github_token   # Optional but recommended
```

> **GitHub Token (Optional but Recommended):** Without a token, GitHub limits you to 60 requests/hour. With a token, the limit is 5000/hour.  
> Generate one at: https://github.com/settings/tokens (no special scopes needed for public data)

### 4. Set up the MySQL database
Make sure MySQL is running, then:
```bash
mysql -u root -p < schema.sql
```
This creates the `github_analyzer` database and the `github_profiles` table.

### 5. Start the server
```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

Server runs at: `http://localhost:3000`

---

## API Endpoints

### Health Check
```
GET /
```
Returns API status and available endpoints.

---

### Analyze & Store a GitHub Profile
```
POST /api/analyze/:username
```
Fetches the GitHub profile, computes insights, and stores/updates the record in MySQL.

**Example:**
```bash
curl -X POST http://localhost:3000/api/analyze/torvalds
```

**Response:**
```json
{
  "success": true,
  "message": "Profile for \"torvalds\" analyzed and stored successfully",
  "data": {
    "username": "torvalds",
    "name": "Linus Torvalds",
    "public_repos": 8,
    "followers": 230000,
    "insights": {
      "total_stars": 198000,
      "top_language": "C",
      "language_breakdown": { "C": 5, "Perl": 1 },
      "most_starred_repo": "linux",
      "open_source_score": "87%",
      "account_age_days": 5423
    }
  }
}
```

---

### Get All Stored Profiles
```
GET /api/profiles
```
Returns a list of all analyzed profiles stored in the database.

**Example:**
```bash
curl http://localhost:3000/api/profiles
```

---

### Get a Single Stored Profile
```
GET /api/profiles/:username
```
Returns the stored analysis data for one user.

**Example:**
```bash
curl http://localhost:3000/api/profiles/torvalds
```

---

### Delete a Profile (Bonus)
```
DELETE /api/profiles/:username
```
Removes a stored profile from the database.

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/profiles/torvalds
```

---

## Database Schema

The `github_profiles` table stores:

| Column | Type | Description |
|---|---|---|
| id | INT | Auto-increment primary key |
| username | VARCHAR | GitHub username (unique) |
| name | VARCHAR | Display name |
| bio | TEXT | Profile bio |
| avatar_url | VARCHAR | Profile picture URL |
| location | VARCHAR | User location |
| public_repos | INT | Number of public repositories |
| followers | INT | Follower count |
| following | INT | Following count |
| total_stars | INT | Sum of stars across all repos |
| total_forks | INT | Sum of forks across all repos |
| top_language | VARCHAR | Most used language |
| language_breakdown | JSON | Language → repo count map |
| most_starred_repo | VARCHAR | Name of most starred repo |
| avg_repo_size_kb | INT | Average repo size in KB |
| recently_active_repos | INT | Repos active in last 30 days |
| open_source_score | INT | % of non-forked repos |
| account_age_days | INT | Age of account in days |
| analyzed_at | DATETIME | When our API last analyzed this |

---

## Project Structure
```
github-profile-analyzer/
├── server.js                  # Express app entry point
├── db.js                      # MySQL connection pool
├── schema.sql                 # Database schema
├── package.json
├── .env.example               # Environment variable template
├── .env                       # Your local config (git-ignored)
├── routes/
│   └── github.js              # API route definitions
├── controllers/
│   └── githubController.js    # Business logic
└── README.md
```

---

## Postman Collection

Import the following into Postman:

1. **POST** `http://localhost:3000/api/analyze/{{username}}`
2. **GET**  `http://localhost:3000/api/profiles`
3. **GET**  `http://localhost:3000/api/profiles/{{username}}`
4. **DELETE** `http://localhost:3000/api/profiles/{{username}}`

Set `username` as a Postman variable for easy testing.
