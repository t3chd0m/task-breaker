# Task Breaker

Break big, overwhelming tasks into simple, clear steps — powered by AI.

## Features

- **AI-Powered Task Breakdown** — Enter any task and get actionable steps instantly
- **User Accounts** — Sign up, log in, and keep your task history
- **Progress Tracking** — Check off steps with visual progress bars
- **Category Tags** — Organize tasks by Home, Work, Self-Care, Learning, or Shopping
- **Task History** — View, expand, and manage all past tasks
- **Dark Mode** — Toggle between light and dark themes
- **Confetti Celebration** — Get a reward animation when you finish all steps
- **Copy Steps** — Copy formatted steps to clipboard
- **Mobile-First** — Responsive design with bottom navigation on mobile
- **Accessible** — ARIA labels, keyboard navigation, high contrast

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS v3, shadcn/ui
- **Backend:** Express 5, Passport.js (local auth), session-based auth
- **Database:** SQLite (via better-sqlite3 + Drizzle ORM)
- **AI:** Proxies to existing Replit AI endpoint

## Quick Start

```bash
npm install
npm run dev
```

The app runs on port 5000. Visit `http://localhost:5000`.

## Production Build

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

## Replit Deployment

1. Create a new Replit with Node.js template
2. Upload all files from this project
3. Click "Run" — the `.replit` config handles everything
4. For production deployment, use Replit's "Deploy" button

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_SECRET` | `task-breaker-secret-key-2026` | Session encryption key (change in production!) |
| `PORT` | `5000` | Server port |

## Database

SQLite database is stored as `data.db` in the project root. It's created automatically on first run. Data persists across restarts.

## Project Structure

```
├── client/           # React frontend
│   └── src/
│       ├── pages/    # Auth, Home, History pages
│       ├── components/  # Header, ThemeProvider
│       └── hooks/    # useAuth hook
├── server/           # Express backend
│   ├── routes.ts     # API routes (auth, tasks, steps, stats)
│   └── storage.ts    # Database CRUD operations
├── shared/           # Shared types (schema.ts)
└── .replit           # Replit configuration
```
