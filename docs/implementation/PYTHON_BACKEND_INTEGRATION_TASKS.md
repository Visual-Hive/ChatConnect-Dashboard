# ChatConnect Dashboard - Python Backend Integration Tasks

**Version:** 1.0  
**Created:** January 2025  
**Status:** Planning

---

## Overview

This document outlines the tasks required to integrate the Python AI backend into the ChatConnect Dashboard, replacing the planned n8n workflow approach.

---

## Phase 1: Express API Updates (Week 1)

### Task 1.1: Update Database Schema

**Duration:** 2-3 hours  
**Files to modify:**
- `shared/schema.ts` → Replace with `shared/schema-v2.ts`

**Actions:**
1. [ ] Add `tier` field to `clients` table
2. [ ] Add LLM configuration fields to `client_widgets` table
3. [ ] Create `documents` table for knowledge base
4. [ ] Create `chat_logs` table for conversation history
5. [ ] Create `usage_stats` table for analytics
6. [ ] Run `npm run db:push` to apply changes
7. [ ] Verify tables in Drizzle Studio

**Verification:**
```bash
npm run db:push
npm run db:studio
# Check all new tables exist with correct columns
```

---

### Task 1.2: Add Python Backend Service

**Duration:** 1-2 hours  
**Files to create:**
- `server/services/python-backend.ts`
- `shared/python-backend-types.ts`

**Actions:**
1. [ ] Copy `python-backend.ts` from updates folder
2. [ ] Copy `python-backend-types.ts` from updates folder
3. [ ] Add environment variables to `.env`
4. [ ] Test import in existing code

**Verification:**
```typescript
import { pythonBackend } from './services/python-backend';

// Should compile without errors
const isAvailable = await pythonBackend.isAvailable();
console.log('Python backend available:', isAvailable);
```

---

### Task 1.3: Update Widget Routes

**Duration:** 2-3 hours  
**Files to modify:**
- `server/routes/widget-routes.ts`

**Actions:**
1. [ ] Replace `callN8nWebhook()` with `pythonBackend.sendChatMessage()`
2. [ ] Add `/chat/stream` endpoint for SSE streaming
3. [ ] Update error handling for Python backend errors
4. [ ] Update health check to include Python backend status
5. [ ] Test with mock Python backend responses

**Testing:**
```bash
# Start Express server
npm run dev

# Test chat endpoint (should return 503 until Python backend is running)
curl -X POST http://localhost:5000/api/widget/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: pk_live_test" \
  -d '{"message": "Hello", "sessionId": "test-uuid"}'
```

---

### Task 1.4: Update Widget JavaScript

**Duration:** 1-2 hours  
**Files to modify:**
- `public/widget/v1/widget.js` → Update or create `public/widget/v2/widget.js`

**Actions:**
1. [ ] Add SSE streaming support
2. [ ] Update API endpoint for streaming
3. [ ] Add streaming message rendering
4. [ ] Handle stream errors gracefully
5. [ ] Test with both streaming and non-streaming modes

**Testing:**
- Open widget test page
- Send message
- Verify streaming response with typing effect

---

### Task 1.5: Add Document Upload Route

**Duration:** 3-4 hours  
**Files to create:**
- `server/routes/document-routes.ts`
- `server/services/document-processor.ts`

**Actions:**
1. [ ] Install dependencies: `npm install multer`
2. [ ] Create document upload endpoint
3. [ ] Validate file type and size
4. [ ] Save document metadata to PostgreSQL
5. [ ] Forward to Python backend for processing
6. [ ] Handle progress callbacks
7. [ ] Add WebSocket for real-time progress updates

**API Design:**
```typescript
// POST /api/dashboard/documents/upload
// Content-Type: multipart/form-data
// Body: file, title?, description?, tags?

// Response:
{
  id: "doc_xxx",
  status: "pending",
  filename: "document.pdf"
}

// Progress updates via WebSocket or polling:
// GET /api/dashboard/documents/:id/status
{
  id: "doc_xxx",
  status: "embedding",
  progress: 75,
  currentStep: "Generating embeddings..."
}
```

---

## Phase 2: Python Backend Setup (Week 1-2)

### Task 2.1: Create Python Project Structure

**Duration:** 2-3 hours  
**Location:** `ai-backend/` (separate repo or subdirectory)

**Actions:**
1. [ ] Initialize Python project with `pyproject.toml`
2. [ ] Create directory structure (see Architecture V2)
3. [ ] Set up virtual environment
4. [ ] Install core dependencies
5. [ ] Create basic FastAPI app

**Dependencies:**
```toml
[project]
name = "chatconnect-ai-backend"
version = "0.1.0"
requires-python = ">=3.11"

dependencies = [
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
    "asyncpg>=0.29.0",
    "redis>=5.0.0",
    "httpx>=0.26.0",
    "anthropic>=0.18.0",
    "openai>=1.10.0",
    "qdrant-client>=1.7.0",
    "langgraph>=0.0.20",
    "structlog>=24.1.0",
    "prometheus-client>=0.19.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=4.1.0",
    "ruff>=0.1.0",
    "mypy>=1.8.0",
]
```

---

### Task 2.2: Implement Core Services

**Duration:** 4-6 hours  

**Files to create:**
- `src/services/qdrant.py` - Vector store operations
- `src/services/anthropic.py` - Claude API with caching
- `src/services/openai_service.py` - GPT-4o-mini + embeddings
- `src/services/cache.py` - Redis caching
- `src/services/postgres.py` - Database operations

**Port from central-assistant:**
- Caching patterns (prompt caching, embedding caching)
- Error handling patterns
- Retry logic

---

### Task 2.3: Implement LangGraph Workflow

**Duration:** 4-6 hours  

**Files to create:**
- `src/graph/state.py` - WidgetChatState
- `src/graph/workflow.py` - 3-node workflow
- `src/graph/nodes/retrieve.py` - Qdrant search
- `src/graph/nodes/generate.py` - LLM generation
- `src/graph/nodes/log.py` - Async logging

**Simplified workflow (vs central-assistant's 8 nodes):**
```python
def create_widget_workflow():
    workflow = StateGraph(WidgetChatState)
    
    workflow.add_node("retrieve", retrieve_context)
    workflow.add_node("generate", generate_response)
    workflow.add_node("log", log_conversation)
    
    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "generate")
    workflow.add_edge("generate", "log")
    workflow.add_edge("log", END)
    
    return workflow.compile()
```

---

### Task 2.4: Implement API Endpoints

**Duration:** 3-4 hours  

**Files to create:**
- `src/api/routes.py` - FastAPI routes
- `src/api/middleware.py` - Auth, CORS, logging
- `src/api/dependencies.py` - DI container

**Endpoints:**
- `POST /chat` - Non-streaming chat
- `POST /chat/stream` - SSE streaming chat
- `POST /process-document` - Document processing
- `GET /documents/{id}/status` - Processing status
- `GET /health` - Health check
- `POST /internal/validate-client` - Client validation

---

### Task 2.5: Implement Document Processing

**Duration:** 4-6 hours  

**Files to create:**
- `src/processing/parser.py` - PDF, DOCX, TXT, CSV parsing
- `src/processing/chunker.py` - Text chunking
- `src/processing/embedder.py` - Batch embedding
- `src/processing/pipeline.py` - Full processing pipeline

**Dependencies to add:**
```toml
"pypdf>=3.17.0",
"python-docx>=1.1.0",
"pandas>=2.1.0",
```

---

## Phase 3: Integration & Testing (Week 2-3)

### Task 3.1: End-to-End Testing

**Duration:** 4-6 hours  

**Test scenarios:**
1. [ ] Widget loads config from Express
2. [ ] Widget sends chat to Python backend
3. [ ] Python backend retrieves from Qdrant
4. [ ] Python backend generates response with correct model (free vs paid)
5. [ ] Response streams back to widget
6. [ ] Chat logged to PostgreSQL
7. [ ] Usage stats updated

**Test commands:**
```bash
# Start all services
docker-compose up -d postgres redis qdrant
npm run dev  # Express
cd ai-backend && uvicorn src.api.main:app --reload  # Python

# Run integration tests
pytest tests/integration/
```

---

### Task 3.2: Document Upload E2E Test

**Duration:** 2-3 hours  

**Test scenarios:**
1. [ ] Upload PDF via dashboard
2. [ ] Express saves metadata, forwards to Python
3. [ ] Python parses, chunks, embeds
4. [ ] Progress updates shown in dashboard
5. [ ] Document searchable via chat

---

### Task 3.3: Load Testing

**Duration:** 2-3 hours  

**Tools:** `locust` or `k6`

**Scenarios:**
- 10 concurrent users chatting
- 100 requests/minute sustained
- Document upload during chat load

**Targets:**
- p95 latency < 5s for chat
- No errors under normal load
- Graceful degradation under overload

---

## Phase 4: Production Readiness (Week 3)

### Task 4.1: Monitoring Setup

**Duration:** 2-3 hours  

**Actions:**
1. [ ] Add Prometheus metrics to Python backend
2. [ ] Create Grafana dashboards
3. [ ] Set up alerts for errors, latency
4. [ ] Add structured logging

---

### Task 4.2: Security Hardening

**Duration:** 2-3 hours  

**Actions:**
1. [ ] Verify all queries filter by client_id
2. [ ] Add rate limiting (Redis-based)
3. [ ] Validate internal API secret
4. [ ] Review CORS configuration
5. [ ] Add input sanitization

---

### Task 4.3: Documentation

**Duration:** 2-3 hours  

**Actions:**
1. [ ] Update API documentation
2. [ ] Create deployment guide
3. [ ] Document environment variables
4. [ ] Create troubleshooting guide

---

## Summary

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| Phase 1 | 1 week | Express API updated for Python backend |
| Phase 2 | 1-2 weeks | Python backend functional |
| Phase 3 | 1 week | Full integration tested |
| Phase 4 | 1 week | Production ready |

**Total estimated time:** 3-4 weeks

---

## Dependencies

### Express Side
- PostgreSQL database running
- Environment variables configured

### Python Side
- Python 3.11+
- PostgreSQL access
- Qdrant instance
- Redis instance
- API keys (Anthropic, OpenAI)

### Both
- Shared internal API secret
- Network connectivity between services
