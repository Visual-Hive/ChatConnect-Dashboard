# ChatConnect Dashboard - Architecture V2

**Version:** 2.0  
**Last Updated:** January 2025  
**Status:** Planning / Implementation

---

## Overview

ChatConnect Dashboard is a multi-tenant SaaS platform providing embeddable AI chat widgets. This document describes the updated architecture with a dedicated Python backend for AI processing.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT WEBSITES                                    │
│                      (Where widgets are embedded)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ widget.js loads
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WIDGET LAYER                                       │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────┐      │
│   │                     widget.js (Vanilla JS)                        │      │
│   │                                                                   │      │
│   │  • Loads config from Express API                                 │      │
│   │  • Sends chat messages to Python Backend (FastAPI)               │      │
│   │  • Streams responses via SSE                                     │      │
│   │  • Local session management                                      │      │
│   └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                              │
          │ GET /api/widget/config                       │ POST /chat (streaming)
          ▼                                              ▼
┌─────────────────────────────┐          ┌─────────────────────────────────────┐
│     EXPRESS API             │          │         PYTHON BACKEND              │
│     (Dashboard + Config)    │          │         (AI Processing)             │
│                             │          │                                     │
│  ┌───────────────────────┐  │          │  ┌─────────────────────────────┐   │
│  │   Dashboard Routes    │  │          │  │        FastAPI              │   │
│  │   • Auth              │  │          │  │   • POST /chat              │   │
│  │   • Widget config     │  │          │  │   • POST /chat/stream       │   │
│  │   • Client management │  │          │  │   • POST /process-document  │   │
│  │   • File upload proxy │  │◄────────►│  │   • GET /health             │   │
│  └───────────────────────┘  │  Internal│  └─────────────────────────────┘   │
│                             │   API    │                │                    │
│  ┌───────────────────────┐  │          │  ┌─────────────────────────────┐   │
│  │   Widget Routes       │  │          │  │       LangGraph             │   │
│  │   • GET /config       │  │          │  │   • retrieve node           │   │
│  │   • Health check      │  │          │  │   • generate node           │   │
│  └───────────────────────┘  │          │  │   • log node (async)        │   │
│                             │          │  └─────────────────────────────┘   │
└──────────────┬──────────────┘          │                │                    │
               │                          │  ┌─────────────────────────────┐   │
               │                          │  │       Services              │   │
               │                          │  │   • Qdrant (vectors)        │   │
               │                          │  │   • Claude/GPT (LLM)        │   │
               │                          │  │   • Redis (cache)           │   │
               │                          │  │   • Embeddings              │   │
               │                          │  └─────────────────────────────┘   │
               │                          │                                     │
               │                          └──────────────────┬──────────────────┘
               │                                             │
               ▼                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   PostgreSQL    │  │     Qdrant      │  │     Redis       │              │
│  │                 │  │                 │  │                 │              │
│  │  • users        │  │  • embeddings   │  │  • query cache  │              │
│  │  • clients      │  │  • chunks       │  │  • embed cache  │              │
│  │  • widgets      │  │  • metadata     │  │  • rate limits  │              │
│  │  • documents    │  │                 │  │  • sessions     │              │
│  │  • chat_logs    │  │                 │  │                 │              │
│  │  • usage_stats  │  │                 │  │                 │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### Express API (Node.js/TypeScript)

**Primary Role:** Dashboard, configuration, authentication

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/*` | User authentication (login, register, logout) |
| `GET/PUT /api/dashboard/widget/:clientId` | Widget configuration CRUD |
| `GET/PATCH /api/dashboard/clients/:clientId` | Client management |
| `POST /api/dashboard/documents/upload` | File upload (proxies to Python) |
| `GET /api/widget/config` | Widget config fetch (API key auth) |
| `GET /api/widget/health` | Health check |

**Does NOT handle:** Chat messages, AI processing, vector search

### Python Backend (FastAPI + LangGraph)

**Primary Role:** AI chat processing, document embedding, vector search

| Endpoint | Purpose |
|----------|---------|
| `POST /chat` | Process chat message, return response |
| `GET /chat/stream` | SSE streaming chat response |
| `POST /process-document` | Chunk and embed uploaded document |
| `POST /embed` | Generate embeddings for text |
| `GET /health` | Health check with queue status |

**Internal endpoints (called by Express):**
| Endpoint | Purpose |
|----------|---------|
| `POST /internal/validate-client` | Validate client ID exists |
| `GET /internal/client/:clientId/config` | Get client's LLM config (model, tier) |

---

## Data Flow: Chat Message

```
1. User types message in widget
   │
2. widget.js validates input (1-2000 chars)
   │
3. POST to Python Backend /chat/stream
   │  Headers: x-api-key: pk_live_xxx
   │  Body: { message, sessionId, metadata }
   │
4. FastAPI validates API key against PostgreSQL
   │  → Retrieves client_id, tier (free/paid), model preference
   │
5. LangGraph workflow executes:
   │
   │  ┌─────────────────────────────────────────┐
   │  │  RETRIEVE NODE                          │
   │  │  • Embed query (text-embedding-3-large) │
   │  │  • Search Qdrant (filter by client_id)  │
   │  │  • Return top 5 relevant chunks         │
   │  └─────────────────────────────────────────┘
   │                    │
   │                    ▼
   │  ┌─────────────────────────────────────────┐
   │  │  GENERATE NODE                          │
   │  │  • Build prompt with context            │
   │  │  • Call LLM (Sonnet 4.5 or GPT-4o-mini) │
   │  │  • Stream response chunks               │
   │  └─────────────────────────────────────────┘
   │                    │
   │                    ▼
   │  ┌─────────────────────────────────────────┐
   │  │  LOG NODE (async, non-blocking)         │
   │  │  • Save to PostgreSQL chat_logs         │
   │  │  • Update usage statistics              │
   │  │  • Track token consumption              │
   │  └─────────────────────────────────────────┘
   │
6. SSE stream back to widget
   │
7. widget.js renders response with typing effect
```

---

## Data Flow: Document Upload

```
1. User uploads file in dashboard
   │
2. Express receives multipart upload
   │  POST /api/dashboard/documents/upload
   │
3. Express validates:
   │  • File type (PDF, DOCX, TXT, CSV)
   │  • File size (<10MB)
   │  • User authentication
   │  • Client ownership
   │
4. Express saves file metadata to PostgreSQL
   │  Status: 'uploading'
   │
5. Express forwards to Python Backend
   │  POST /process-document
   │  Body: { document_id, client_id, file_data (base64), file_type }
   │
6. Python processes asynchronously:
   │
   │  ┌─────────────────────────────────────────┐
   │  │  PARSE                                  │
   │  │  • Extract text from PDF/DOCX/TXT       │
   │  │  • Parse CSV rows                       │
   │  └─────────────────────────────────────────┘
   │                    │
   │                    ▼
   │  ┌─────────────────────────────────────────┐
   │  │  CHUNK                                  │
   │  │  • Split into ~500 token chunks         │
   │  │  • Overlap 50 tokens between chunks     │
   │  └─────────────────────────────────────────┘
   │                    │
   │                    ▼
   │  ┌─────────────────────────────────────────┐
   │  │  EMBED                                  │
   │  │  • Generate embeddings (batch)          │
   │  │  • Cache embeddings in Redis            │
   │  └─────────────────────────────────────────┘
   │                    │
   │                    ▼
   │  ┌─────────────────────────────────────────┐
   │  │  STORE                                  │
   │  │  • Upsert to Qdrant with metadata       │
   │  │  • client_id, document_id in payload    │
   │  └─────────────────────────────────────────┘
   │
7. Python calls back to Express with progress
   │  POST /api/internal/document-progress
   │  Body: { document_id, status, progress, chunks_total, qdrant_point_ids }
   │
8. Express updates PostgreSQL, broadcasts via WebSocket
   │
9. Dashboard shows real-time progress
```

---

## Multi-Tenant Isolation

### Database Level (PostgreSQL)

Every query MUST include `client_id` filter:

```sql
-- ✅ CORRECT
SELECT * FROM documents WHERE client_id = $1 AND id = $2;

-- ❌ WRONG (exposes all clients' data)
SELECT * FROM documents WHERE id = $1;
```

### Vector Level (Qdrant)

All Qdrant points include `client_id` in payload:

```python
# When storing
qdrant.upsert(
    collection_name="documents",
    points=[
        PointStruct(
            id=chunk_id,
            vector=embedding,
            payload={
                "client_id": client_id,  # REQUIRED
                "document_id": document_id,
                "content": chunk_text,
                "chunk_index": i
            }
        )
    ]
)

# When searching - ALWAYS filter
qdrant.search(
    collection_name="documents",
    query_vector=query_embedding,
    query_filter=Filter(
        must=[
            FieldCondition(
                key="client_id",
                match=MatchValue(value=client_id)  # REQUIRED
            )
        ]
    ),
    limit=5
)
```

---

## LLM Tier Strategy

| Tier | Model | Use Case | Cost |
|------|-------|----------|------|
| Free | GPT-4o-mini | Trial users, basic queries | ~$0.0001/query |
| Paid | Claude Sonnet 4.5 | Paying customers, complex queries | ~$0.003/query |

Selection logic in Python backend:

```python
async def get_llm_for_client(client_id: str) -> BaseLLM:
    client = await get_client(client_id)
    
    if client.tier == "free":
        return OpenAI(model="gpt-4o-mini", temperature=0.7)
    else:
        return Anthropic(model="claude-sonnet-4-5-20250514", temperature=0.7)
```

---

## Caching Strategy

### Layer 1: Prompt Caching (Anthropic)

```python
# Static system prompt is cached (90% cost reduction)
response = await anthropic.messages.create(
    model="claude-sonnet-4-5-20250514",
    system=[
        {
            "type": "text",
            "text": STATIC_SYSTEM_PROMPT,  # ~2000 tokens
            "cache_control": {"type": "ephemeral"}
        },
        {
            "type": "text", 
            "text": dynamic_context  # ~200 tokens, not cached
        }
    ],
    messages=[...]
)
```

### Layer 2: Query Cache (Redis)

```python
# Cache common queries for 5 minutes
cache_key = f"query:{client_id}:{hash(query)}"
cached = await redis.get(cache_key)
if cached:
    return json.loads(cached)

# Execute search...
await redis.setex(cache_key, 300, json.dumps(results))
```

### Layer 3: Embedding Cache (Redis)

```python
# Cache embeddings for 1 hour
cache_key = f"embed:{hash(text)}"
cached = await redis.get(cache_key)
if cached:
    return json.loads(cached)

# Generate embedding...
await redis.setex(cache_key, 3600, json.dumps(embedding))
```

---

## Environment Variables

### Express API (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/chatconnect

# Session
SESSION_SECRET=your-session-secret

# Python Backend
PYTHON_BACKEND_URL=http://localhost:8000
PYTHON_BACKEND_SECRET=internal-api-secret

# File Storage
UPLOAD_DIR=/var/uploads
MAX_FILE_SIZE=10485760  # 10MB
```

### Python Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/chatconnect

# Vector Store
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=optional-api-key

# Cache
REDIS_URL=redis://localhost:6379

# LLM Providers
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# Embeddings
EMBEDDING_MODEL=text-embedding-3-large

# Internal Auth
INTERNAL_API_SECRET=internal-api-secret

# Server
HOST=0.0.0.0
PORT=8000
WORKERS=4
```

---

## Deployment Topology

### Development

```
localhost:5000  → Express (npm run dev)
localhost:8000  → Python (uvicorn)
localhost:5432  → PostgreSQL
localhost:6333  → Qdrant
localhost:6379  → Redis
```

### Production

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │  (Nginx/Caddy)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Express  │  │ Express  │  │  Python  │
        │  :5000   │  │  :5001   │  │  :8000   │
        └──────────┘  └──────────┘  └──────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Postgres │  │  Qdrant  │  │  Redis   │
        │ (managed)│  │ (managed)│  │ (managed)│
        └──────────┘  └──────────┘  └──────────┘
```

---

## Security Considerations

1. **API Key Validation:** Every widget request validates `x-api-key` header
2. **Domain Restriction:** CORS validates against `allowedDomains` per client
3. **Rate Limiting:** Redis-based rate limiting (100 req/min for free, 1000 for paid)
4. **Input Sanitization:** All user input sanitized before LLM processing
5. **Internal API Auth:** Express ↔ Python communication uses shared secret
6. **SQL Injection Prevention:** Parameterized queries only (Drizzle ORM)
7. **XSS Prevention:** Widget sanitizes all rendered content

---

## Monitoring

### Metrics (Prometheus)

```python
# Python backend metrics
chat_requests_total{client_id, tier, status}
chat_latency_seconds{client_id, tier}
llm_tokens_total{model, type}  # input/output/cached
qdrant_search_duration_seconds
embedding_cache_hits_total
embedding_cache_misses_total
```

### Logging (Structured)

```python
logger.info(
    "chat_request_completed",
    trace_id=trace_id,
    client_id=client_id,
    latency_ms=latency,
    tokens_in=tokens_in,
    tokens_out=tokens_out,
    cache_hit=cache_hit
)
```

---

## Next Steps

1. **Phase 1:** Update Express routes to remove n8n, add Python backend proxy
2. **Phase 2:** Create Python backend project structure
3. **Phase 3:** Implement LangGraph workflow
4. **Phase 4:** Add document processing pipeline
5. **Phase 5:** Production deployment and monitoring
