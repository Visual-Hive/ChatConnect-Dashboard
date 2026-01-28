# ChatConnect Dashboard

A multi-tenant SaaS platform providing embeddable AI chat widgets with knowledge base integration.

## Overview

ChatConnect Dashboard enables businesses to deploy AI-powered chat widgets on their websites. The platform features:

- **Multi-tenant architecture** - Complete data isolation per client
- **AI-powered chat** - RAG (Retrieval-Augmented Generation) with client-specific knowledge bases
- **Tiered pricing** - Free (testing) and Paid (production) tiers with different LLM models
- **Dashboard** - Self-service configuration, analytics, and management

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Client Websites (embed widget.js)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌──────────────────────────┐    ┌─────────────────────────────────┐
│  Express API             │    │  Python Backend (FastAPI)       │
│  • Dashboard & auth      │    │  • AI chat processing           │
│  • Widget configuration  │    │  • Document embedding           │
│  • File upload           │    │  • LangGraph workflows          │
│  Port: 5000              │    │  Port: 8000                     │
└───────────┬──────────────┘    └──────────────┬──────────────────┘
            │                                   │
            └───────────────┬───────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │ PostgreSQL │  │   Qdrant   │  │   Redis    │
     │   (data)   │  │ (vectors)  │  │  (cache)   │
     └────────────┘  └────────────┘  └────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Dashboard | React 18, TypeScript, Tailwind CSS, Radix UI |
| Dashboard API | Express.js, Drizzle ORM |
| AI Backend | Python 3.11+, FastAPI, LangGraph |
| Database | PostgreSQL 16+ |
| Vector Store | Qdrant |
| Cache | Redis |
| LLM (Free) | OpenAI GPT-4o-mini |
| LLM (Paid) | Anthropic Claude Sonnet 4.5 |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for ai-backend development)

### Run with Docker (Recommended)

```bash
# Clone repository
git clone <repository-url>
cd ChatConnectDashboard

# Copy environment template
cp .env.example .env

# Start all services
docker-compose up -d

# Access dashboard
open http://localhost:5000
```

### Local Development

```bash
# Install Node dependencies
npm install

# Push database schema
npm run db:push

# Start Express + React (hot reload)
npm run dev

# In another terminal, start Python backend
cd ai-backend
pip install -e ".[dev]"
uvicorn src.api.main:app --reload --port 8000
```

## Project Structure

```
ChatConnectDashboard/
├── client/              # React dashboard
├── server/              # Express API
├── ai-backend/          # Python FastAPI backend
├── shared/              # Shared types and schema
├── public/widget/       # Embeddable chat widget
├── docs/                # Documentation
│   ├── implementation/  # Implementation tasks
│   └── archive/         # Archived docs
└── .clinerules/         # AI assistant rules
```

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/README.md](docs/README.md) | Documentation navigation |
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Local development setup |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design |
| [docs/implementation/TASKS.md](docs/implementation/TASKS.md) | Implementation tasks |
| [docs/implementation/HUMAN_REVIEW_GUIDE.md](docs/implementation/HUMAN_REVIEW_GUIDE.md) | Working with AI assistants |

## Development Status

### ✅ Completed
- React dashboard UI
- Express API for dashboard/configuration
- Embeddable widget (v1 + v2)
- PostgreSQL schema with multi-tenant isolation
- Docker Compose infrastructure

### 🔄 In Progress
- Python FastAPI backend services
- LangGraph chat workflow
- Qdrant vector search integration
- Document processing pipeline

See [docs/implementation/TASKS.md](docs/implementation/TASKS.md) for detailed task breakdown.

## Key Commands

```bash
# Docker
docker-compose up -d           # Start all services
docker-compose logs -f         # View logs
docker-compose down            # Stop all services

# Development
npm run dev                    # Start Express + React
npm run db:push               # Push schema to database
npm run db:studio             # Open Drizzle Studio

# Python backend
cd ai-backend
uvicorn src.api.main:app --reload --port 8000
pytest                        # Run tests
```

## Environment Variables

See `.env.example` for all configuration options. Key variables:

```env
# Database
DATABASE_URL=postgresql://...

# Session
SESSION_SECRET=your-secret-min-32-chars

# Python Backend
PYTHON_BACKEND_URL=http://localhost:8000

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Security

This is a multi-tenant application. **Every database and vector query MUST filter by `clientId`**.

```typescript
// ✅ CORRECT
const widget = await db.query.widgetConfig.findFirst({
  where: and(
    eq(widgetConfig.clientId, clientId),  // Required!
    eq(widgetConfig.id, widgetId)
  )
});
```

See [docs/implementation/HUMAN_REVIEW_GUIDE.md](docs/implementation/HUMAN_REVIEW_GUIDE.md) for security review guidelines.

## License

MIT
