# Implementation Tasks

**Last Updated:** January 2025  
**Status:** Active Development

This document tracks what needs to be implemented, in priority order. Use this as the source of truth for Claude Code / Cline development sessions.

---

## 🎯 Current Priority: Python Backend Implementation

The Express API and React dashboard are largely complete. The main work remaining is implementing the Python FastAPI backend that handles AI chat processing.

---

## ✅ Completed

### Express API
- [x] User authentication (login/logout)
- [x] Session management with PostgreSQL
- [x] Client management CRUD
- [x] Widget configuration CRUD
- [x] API key generation and validation
- [x] Domain restriction middleware
- [x] Widget file serving with CDN headers
- [x] Python backend service client (`server/services/python-backend.ts`)
- [x] Widget routes v2 (`server/routes/widget-routes-v2.ts`)

### React Dashboard
- [x] Login page
- [x] Overview dashboard
- [x] Widget configuration page with live preview
- [x] Settings page with API key management
- [x] Knowledge base page (UI only)
- [x] Analytics page (mock data)
- [x] Theme support (light/dark)

### Widget
- [x] Vanilla JS widget (v1 and v2)
- [x] CSS with theming support
- [x] Session management
- [x] Streaming support (v2)

### Infrastructure
- [x] Docker Compose setup
- [x] PostgreSQL schema (Drizzle ORM)
- [x] Multi-tenant isolation in schema

---

## 🔄 In Progress / Needs Implementation

### Phase 1: Python Backend Core Services (Priority: HIGH)

These services form the foundation of AI chat processing.

#### Task 1.1: Qdrant Service
**File:** `ai-backend/src/services/qdrant.py`
**Estimated:** 2-3 hours
**Review Required:** Yes (security - multi-tenant filtering)

Implement vector store operations:
- [ ] Initialize Qdrant client connection
- [ ] Create collection if not exists
- [ ] Search with client_id filtering (CRITICAL for multi-tenant)
- [ ] Upsert vectors with metadata
- [ ] Delete vectors by document_id

**Key Pattern:**
```python
# ALWAYS filter by client_id
results = await qdrant.search(
    collection_name="documents",
    query_vector=embedding,
    query_filter=Filter(must=[
        FieldCondition(key="client_id", match=MatchValue(value=client_id))
    ])
)
```

#### Task 1.2: LLM Service
**File:** `ai-backend/src/services/llm.py`
**Estimated:** 3-4 hours
**Review Required:** Yes (cost implications, prompt design)

Implement LLM providers:
- [ ] Anthropic Claude client with prompt caching
- [ ] OpenAI GPT-4o-mini client
- [ ] Model selection based on client tier
- [ ] Token tracking for usage billing
- [ ] Streaming response support

**Tier Logic:**
- Free tier → GPT-4o-mini
- Paid tier → Claude Sonnet 4.5

#### Task 1.3: Redis Cache Service
**File:** `ai-backend/src/services/cache.py`
**Estimated:** 1-2 hours
**Review Required:** No

Implement caching:
- [ ] Query result caching (5 min TTL)
- [ ] Embedding caching (1 hour TTL)
- [ ] Rate limit counter storage
- [ ] Session data (optional)

#### Task 1.4: PostgreSQL Service
**File:** `ai-backend/src/services/postgres.py`
**Estimated:** 2-3 hours
**Review Required:** Yes (multi-tenant queries)

Implement database operations:
- [ ] Connection pool setup
- [ ] Client validation by API key
- [ ] Chat log insertion
- [ ] Usage stats updates
- [ ] Document metadata queries

---

### Phase 2: LangGraph Workflow (Priority: HIGH)

#### Task 2.1: Widget Chat State
**File:** `ai-backend/src/graph/widget_state.py`
**Estimated:** 1 hour
**Review Required:** No

Define state schema for chat workflow.

#### Task 2.2: Retrieve Node
**File:** `ai-backend/src/graph/nodes/widget/retrieve.py`
**Estimated:** 2-3 hours
**Review Required:** Yes (query construction, relevance)

Implement context retrieval:
- [ ] Embed user query
- [ ] Search Qdrant with client_id filter
- [ ] Score and rank results
- [ ] Format context for LLM

#### Task 2.3: Generate Node
**File:** `ai-backend/src/graph/nodes/widget/generate.py`
**Estimated:** 3-4 hours
**Review Required:** Yes (prompt engineering, response quality)

Implement response generation:
- [ ] Build prompt with context
- [ ] Select LLM based on tier
- [ ] Generate response (streaming)
- [ ] Extract sources for citations

#### Task 2.4: Log Node
**File:** `ai-backend/src/graph/nodes/widget/log.py`
**Estimated:** 1-2 hours
**Review Required:** No

Implement async logging:
- [ ] Log to PostgreSQL (non-blocking)
- [ ] Update usage stats
- [ ] Track token consumption

#### Task 2.5: Workflow Assembly
**File:** `ai-backend/src/graph/widget_workflow.py`
**Estimated:** 1-2 hours
**Review Required:** Yes (flow correctness)

Wire up the workflow:
- [ ] Create StateGraph
- [ ] Add nodes
- [ ] Define edges
- [ ] Compile workflow

---

### Phase 3: Document Processing (Priority: MEDIUM)

#### Task 3.1: Document Parser
**File:** `ai-backend/src/processing/parser.py`
**Estimated:** 3-4 hours
**Review Required:** No

Parse uploaded documents:
- [ ] PDF text extraction
- [ ] DOCX parsing
- [ ] TXT/CSV handling
- [ ] Error handling for corrupt files

#### Task 3.2: Text Chunker
**File:** `ai-backend/src/processing/chunker.py`
**Estimated:** 2-3 hours
**Review Required:** Yes (chunk size affects quality)

Implement chunking:
- [ ] Split into ~500 token chunks
- [ ] 50 token overlap
- [ ] Preserve paragraph boundaries
- [ ] Handle edge cases

#### Task 3.3: Embedder
**File:** `ai-backend/src/processing/embedder.py`
**Estimated:** 2-3 hours
**Review Required:** No

Generate embeddings:
- [ ] Batch embedding API calls
- [ ] Cache embeddings in Redis
- [ ] Handle rate limits

#### Task 3.4: Processing Pipeline
**File:** `ai-backend/src/processing/pipeline.py`
**Estimated:** 2-3 hours
**Review Required:** Yes (end-to-end flow)

Wire up the pipeline:
- [ ] Orchestrate parse → chunk → embed → store
- [ ] Progress tracking
- [ ] Error handling and retry
- [ ] Callback to Express for status updates

---

### Phase 4: API Endpoints (Priority: HIGH)

#### Task 4.1: Chat Endpoints
**File:** `ai-backend/src/api/routes.py`
**Estimated:** 3-4 hours
**Review Required:** Yes (API contract)

Complete the API:
- [ ] POST /api/widget/chat (non-streaming)
- [ ] POST /api/widget/chat/stream (SSE)
- [ ] API key validation middleware
- [ ] Rate limiting middleware
- [ ] CORS configuration

#### Task 4.2: Document Endpoints
**Estimated:** 2-3 hours
**Review Required:** Yes (file security)

Add document processing:
- [ ] POST /api/widget/process-document
- [ ] GET /api/widget/documents/{id}/status
- [ ] Async processing queue

---

### Phase 5: Testing & Hardening (Priority: MEDIUM)

#### Task 5.1: Unit Tests
**Estimated:** 4-6 hours
**Review Required:** Yes (coverage)

- [ ] Service layer tests
- [ ] Node function tests
- [ ] API route tests

#### Task 5.2: Integration Tests
**Estimated:** 4-6 hours
**Review Required:** Yes

- [ ] End-to-end chat flow
- [ ] Document processing flow
- [ ] Multi-tenant isolation verification

#### Task 5.3: Rate Limiting
**Estimated:** 2-3 hours
**Review Required:** Yes (limits appropriate)

- [ ] Implement Redis-based rate limiting
- [ ] Free tier: 100 req/hour
- [ ] Paid tier: 1000 req/hour
- [ ] Overage tracking for billing

---

## 📋 Task Priority Summary

| Priority | Task | Estimated | Requires Review |
|----------|------|-----------|-----------------|
| P0 | Qdrant Service | 2-3h | ✅ Yes |
| P0 | LLM Service | 3-4h | ✅ Yes |
| P0 | Chat Endpoints | 3-4h | ✅ Yes |
| P0 | LangGraph Workflow | 8-10h | ✅ Yes |
| P1 | Redis Cache | 1-2h | No |
| P1 | PostgreSQL Service | 2-3h | ✅ Yes |
| P1 | Document Processing | 10-12h | ✅ Yes |
| P2 | Testing | 8-12h | ✅ Yes |
| P2 | Rate Limiting | 2-3h | ✅ Yes |

**Total Estimated Time:** 40-55 hours

---

## 🔒 Security Review Checkpoints

The following MUST have human review before merging:

1. **Any Qdrant query** - Must verify client_id filter
2. **Any PostgreSQL query** - Must verify client_id filter
3. **API key validation** - Must verify secure comparison
4. **Rate limiting logic** - Must verify correct limits
5. **LLM prompts** - Must verify no prompt injection risks
6. **File upload handling** - Must verify type/size validation

---

## 📚 Reference Documentation

- **Architecture:** [../ARCHITECTURE.md](../ARCHITECTURE.md)
- **Billing/Limits:** [../BILLING_AND_LIMITS.md](../BILLING_AND_LIMITS.md)
- **Detailed Tasks:** [PYTHON_BACKEND_INTEGRATION_TASKS.md](./PYTHON_BACKEND_INTEGRATION_TASKS.md)
- **Widget Backend Details:** [WIDGET_LIGHT_BACKEND_TASKS.md](./WIDGET_LIGHT_BACKEND_TASKS.md)

---

## 🚀 Getting Started on a Task

1. Read this task list to understand priorities
2. Check [HUMAN_REVIEW_GUIDE.md](./HUMAN_REVIEW_GUIDE.md) for review requirements
3. Read `.clinerules/clinerules` for coding patterns
4. Start with a P0 task that doesn't require review (or get review first)
5. After completing, update this document with [x] checkmarks
