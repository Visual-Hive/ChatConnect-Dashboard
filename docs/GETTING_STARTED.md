# Getting Started

This guide will get you from zero to a running local development environment in under 15 minutes.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 20+** - `node --version`
- **Docker & Docker Compose** - `docker --version`
- **Python 3.11+** - `python3 --version` (for ai-backend development)
- **Git** - `git --version`

## Quick Start (Docker - Recommended)

The fastest way to get everything running:

```bash
# Clone the repository
git clone <repository-url>
cd ChatConnectDashboard

# Copy environment template
cp .env.example .env

# Start all services
docker-compose up -d

# Wait for services to be healthy (30-60 seconds)
docker-compose ps

# Access the dashboard
open http://localhost:5000
```

### What Docker Starts

| Service | Port | Purpose |
|---------|------|---------|
| Express + React | 5000 | Dashboard and API |
| Python FastAPI | 8000 | AI chat processing |
| PostgreSQL | 5432 | Database |
| Qdrant | 6333 | Vector store |
| Redis | 6379 | Cache |

---

## Development Setup (Without Docker)

If you prefer running services locally:

### 1. Database Setup

**Option A: Local PostgreSQL**
```bash
# macOS
brew install postgresql@16
brew services start postgresql@16
createdb chatconnect

# Set in .env
DATABASE_URL=postgresql://localhost:5432/chatconnect
```

**Option B: Use Docker just for databases**
```bash
docker-compose up -d postgres redis qdrant
```

### 2. Environment Variables

Create `.env` from the example:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL=postgresql://localhost:5432/chatconnect

# Session (generate a random secret)
SESSION_SECRET=your-random-secret-min-32-chars

# Python backend
PYTHON_BACKEND_URL=http://localhost:8000

# LLM providers (get from provider dashboards)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Install Dependencies & Start

**Express + React:**
```bash
npm install
npm run db:push   # Create database tables
npm run dev       # Start on http://localhost:5000
```

**Python backend:**
```bash
cd ai-backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn src.api.main:app --reload --port 8000
```

---

## Verify Your Setup

### 1. Dashboard loads
Open http://localhost:5000 - you should see the login page.

### 2. API responds
```bash
curl http://localhost:5000/api/widget/health
# Expected: {"status":"ok"}
```

### 3. Python backend responds
```bash
curl http://localhost:8000/health
# Expected: {"status":"healthy","service":"widget-light"}
```

### 4. Database has tables
```bash
npm run db:studio
# Opens Drizzle Studio - you should see users, clients, client_widgets tables
```

---

## Project Structure Overview

```
ChatConnectDashboard/
├── client/                 # React dashboard
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # Utilities
│   └── index.html
│
├── server/                 # Express API
│   ├── routes/             # API routes
│   ├── middleware/         # Auth, validation
│   ├── services/           # External services
│   └── index.ts            # Entry point
│
├── ai-backend/             # Python FastAPI
│   ├── src/
│   │   ├── api/            # FastAPI routes
│   │   ├── graph/          # LangGraph workflows
│   │   ├── services/       # Qdrant, LLM, Redis
│   │   └── models/         # Pydantic models
│   └── pyproject.toml
│
├── shared/                 # Shared code
│   ├── schema.ts           # Database schema (Drizzle)
│   └── types.ts            # Shared TypeScript types
│
├── public/widget/          # Embeddable widget
│   ├── v1/                 # Widget version 1
│   └── v2/                 # Widget version 2
│
├── docs/                   # Documentation
│   ├── implementation/     # Implementation tasks
│   └── archive/            # Archived docs
│
└── .clinerules/            # AI assistant rules
```

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `server/routes.ts` | All Express route registration |
| `shared/schema.ts` | Database schema (current) |
| `shared/schema-v2.ts` | Database schema (new version) |
| `client/src/App.tsx` | React app entry and routing |
| `.clinerules/clinerules` | Rules for AI code assistants |
| `docker-compose.yml` | Service definitions |

---

## Common Tasks

### Create a new user (development)

The dashboard doesn't have public registration. For development:

```bash
# Access the database
docker-compose exec postgres psql -U postgres -d chatconnect

# Or use Drizzle Studio
npm run db:studio
```

### Test the widget

1. Go to Settings → Get your API key
2. Open `public/widget-test.html` in a browser
3. Replace `YOUR_API_KEY` with your actual key

### Run tests

```bash
# TypeScript
npm test

# Python
cd ai-backend && pytest
```

---

## Troubleshooting

### "Cannot connect to database"

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection string
echo $DATABASE_URL

# Restart database
docker-compose restart postgres
```

### "Port 5000 already in use"

```bash
# Find what's using it
lsof -i :5000

# Kill it or change PORT in .env
PORT=3000 npm run dev
```

### "Module not found" errors

```bash
# Reinstall node dependencies
rm -rf node_modules package-lock.json
npm install

# Reinstall Python dependencies
cd ai-backend
pip install -e ".[dev]"
```

### "Python backend not responding"

```bash
# Check it's running
curl http://localhost:8000/health

# Check logs
docker-compose logs ai-backend

# Restart
docker-compose restart ai-backend
```

---

## Next Steps

1. **Understand the architecture**: Read [ARCHITECTURE.md](./ARCHITECTURE.md)
2. **Learn the code patterns**: Read [DEVELOPMENT.md](./DEVELOPMENT.md)
3. **See what needs building**: Read [implementation/TASKS.md](./implementation/TASKS.md)
4. **If using AI assistants**: Read [implementation/HUMAN_REVIEW_GUIDE.md](./implementation/HUMAN_REVIEW_GUIDE.md)

---

## Need Help?

- Check [docs/README.md](./README.md) for documentation map
- Review `.clinerules/` for coding patterns
- Check `docs/archive/` for historical context
