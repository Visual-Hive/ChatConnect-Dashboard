# ChatConnect Dashboard - Documentation

Welcome to the ChatConnect Dashboard documentation. This is a multi-tenant SaaS platform that provides embeddable AI chat widgets.

## 📖 Documentation Map

### For New Developers
Start here to understand the project and get your environment running:

| Document | Purpose |
|----------|---------|
| [GETTING_STARTED.md](./GETTING_STARTED.md) | Setup your local environment and run the project |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Understand the system design and data flows |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Code conventions, patterns, and workflows |

### Core Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, component responsibilities, data flows |
| [BILLING_AND_LIMITS.md](./BILLING_AND_LIMITS.md) | Pricing tiers, rate limits, usage tracking |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment guide |

### For AI-Assisted Development (Claude Code / Cline)

| Document | Purpose |
|----------|---------|
| [implementation/TASKS.md](./implementation/TASKS.md) | Current implementation tasks and priorities |
| [implementation/HUMAN_REVIEW_GUIDE.md](./implementation/HUMAN_REVIEW_GUIDE.md) | When and what humans need to review |

### Reference

| Location | Purpose |
|----------|---------|
| [ai-backend/README.md](../ai-backend/README.md) | Python FastAPI backend documentation |
| [.clinerules/](../.clinerules/) | AI coding assistant rules and instructions |
| [archive/](./archive/) | Archived documentation (historical reference only) |

---

## 🏗️ System Overview

ChatConnect Dashboard is a multi-tenant SaaS platform with:

```
┌─────────────────────────────────────────────────────────────┐
│  Client Websites (embed widget.js)                          │
└─────────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌─────────────────────┐     ┌─────────────────────────────────┐
│  Express API        │     │  Python Backend (FastAPI)       │
│  (Dashboard + Auth) │     │  (AI Chat Processing)           │
│                     │     │                                 │
│  • User auth        │     │  • Chat with RAG                │
│  • Widget config    │     │  • Document processing          │
│  • File upload      │     │  • LLM integration              │
└─────────┬───────────┘     └────────────────┬────────────────┘
          │                                   │
          └───────────────┬───────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │ PostgreSQL │  │   Qdrant   │  │   Redis    │
   │ (data)     │  │ (vectors)  │  │ (cache)    │
   └────────────┘  └────────────┘  └────────────┘
```

---

## 🚦 Current Implementation Status

### ✅ Completed
- React dashboard UI
- Express API for dashboard and configuration
- Widget JavaScript (v1 and v2)
- PostgreSQL schema with multi-tenant isolation
- Docker Compose setup
- Authentication and session management

### 🔄 In Progress / Needs Implementation
- Python FastAPI backend (structure exists, services need implementation)
- LangGraph workflow for chat processing
- Qdrant vector search integration
- Redis caching layer
- Document processing pipeline

See [implementation/TASKS.md](./implementation/TASKS.md) for detailed task breakdown.

---

## 🔒 Key Principles

### 1. Multi-Tenant Isolation
**Every database query MUST filter by `clientId`** - this is non-negotiable for security.

### 2. Tiered Architecture
- **Free tier**: Dashboard testing only, GPT-4o-mini
- **Paid tier**: External deployment, Claude Sonnet 4.5

### 3. Service Separation
- Express handles: Dashboard, auth, configuration
- Python handles: Chat, AI processing, RAG

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete details.

---

## 📁 Project Structure

```
ChatConnectDashboard/
├── client/              # React dashboard (TypeScript)
├── server/              # Express API (TypeScript)
├── ai-backend/          # Python FastAPI backend
├── shared/              # Shared types and schema
├── public/widget/       # Embeddable widget (vanilla JS)
├── docs/                # Documentation (you are here)
│   ├── implementation/  # Implementation tasks
│   └── archive/         # Archived docs
└── .clinerules/         # AI assistant rules
```

---

## 🛠️ Quick Commands

```bash
# Start all services with Docker
docker-compose up -d

# Development mode (hot reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Run Express + React only
npm run dev

# Database operations
npm run db:push     # Push schema changes
npm run db:studio   # Open Drizzle Studio

# Python backend (standalone)
cd ai-backend && uvicorn src.api.main:app --reload
```

---

## 📚 Further Reading

- **Getting started**: [GETTING_STARTED.md](./GETTING_STARTED.md)
- **Implementation tasks**: [implementation/TASKS.md](./implementation/TASKS.md)
- **When to review AI code**: [implementation/HUMAN_REVIEW_GUIDE.md](./implementation/HUMAN_REVIEW_GUIDE.md)
