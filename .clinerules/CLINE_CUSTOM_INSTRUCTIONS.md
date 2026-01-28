# Chat Connect Dashboard - Custom Instructions for Cline

**Paste these instructions into Cline's Custom Instructions field (VSCode Extension Settings)**

---

## Core Behavior

You are developing Chat Connect Dashboard, a multi-tenant SaaS platform for AI-powered chat widgets. The system uses:
- **Express.js** for dashboard API and configuration
- **Python FastAPI** for AI chat processing
- **PostgreSQL + Qdrant** for data and vector storage
- **Redis** for caching and rate limiting

Always follow these principles:

### 1. Analysis Before Action

**BEFORE writing ANY code:**
- Read relevant documentation (`docs/ARCHITECTURE.md`, `docs/BILLING_AND_LIMITS.md`)
- Analyze existing code patterns thoroughly
- State your understanding of the requirement
- Outline your implementation approach
- Rate your confidence (1-10)
- If confidence <8, ask questions first

### 2. Never Omit Code

**DO NOT BE LAZY. DO NOT OMIT CODE.**

- Always provide complete implementations
- NEVER use comments like `// ... rest of code` or `// existing code...`
- If a file is long, show it in sections but include ALL code
- Never say "keep the existing code" - show the complete file

### 3. Security First - Multi-Tenant Isolation

**CRITICAL:** This is a multi-tenant application. Every database query MUST filter by `clientId`.

```typescript
// ✅ CORRECT
const widget = await db.query.widgetConfig.findFirst({
  where: and(
    eq(widgetConfig.clientId, clientId),
    eq(widgetConfig.id, widgetId)
  )
});

// ❌ WRONG - Security vulnerability!
const widget = await db.query.widgetConfig.findFirst({
  where: eq(widgetConfig.id, widgetId)
});
```

```python
# ✅ CORRECT
results = await qdrant.search(
    collection_name="documents",
    query_vector=embedding,
    query_filter=Filter(must=[
        FieldCondition(key="client_id", match=MatchValue(value=client_id))
    ])
)

# ❌ WRONG - Returns all clients' documents!
results = await qdrant.search(
    collection_name="documents",
    query_vector=embedding
)
```

### 4. Tier and Billing Awareness

**Remember the pricing model:**

| Feature | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Widget deployment | Dashboard only | Any domain |
| Rate limit | 100 req/hour | 1000 req/hour + overage |
| LLM Model | GPT-4o-mini | Claude Sonnet 4.5 |

**Always check tier before:**
- Allowing external deployment (free = dashboard only)
- Selecting LLM model
- Processing rate limit overages

```python
# Check deployment is allowed
if client.tier == "free":
    if not is_dashboard_origin(request.headers.get("origin")):
        raise HTTPException(403, "Deployment requires paid plan")
```

### 5. TypeScript & Python Standards

**TypeScript:**
- Strict mode - No `any` types
- Explicit return types
- Interface over type for objects

**Python:**
- Type hints required on all functions
- Pydantic models for validation
- Async by default for I/O
- structlog for logging (not print)

### 6. Architecture Awareness

```
┌─────────────────┐     ┌─────────────────┐
│  Chat Widget    │────▶│  Python Backend │
│  (widget.js)    │     │  (FastAPI)      │
└─────────────────┘     └────────┬────────┘
         │                       │
         │ GET /config           │ LangGraph workflow
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Express API    │     │  Qdrant + Redis │
│  (Dashboard)    │     │  (AI Services)  │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   (All data)    │
└─────────────────┘
```

**Key points:**
- Widget calls Python directly for chat (not Express)
- Widget calls Express only for config
- Both services share PostgreSQL
- Python owns Qdrant and Redis

### 7. Confidence Rating

Rate your confidence before significant changes:

- **9-10**: Proceed with implementation
- **7-8**: Proceed but flag for review
- **5-6**: Ask clarifying questions first
- **1-4**: Stop and request human guidance

### 8. Error Handling

**Consistent format across both services:**

```typescript
// Express
return res.status(400).json({
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid widget configuration'
  }
});
```

```python
# FastAPI
raise HTTPException(
    status_code=400,
    detail={
        "code": "VALIDATION_ERROR",
        "message": "Invalid widget configuration"
    }
)
```

### 9. Rate Limiting

**Always apply rate limits in Python backend:**

```python
# Before processing any chat request
result = await check_rate_limit(client_id, client.tier)

if not result.allowed:
    if client.tier == "free":
        raise HTTPException(429, {
            "code": "RATE_LIMIT_EXCEEDED",
            "message": "Upgrade to continue",
            "upgrade_url": "https://chatconnect.com/upgrade"
        })
    else:
        raise HTTPException(429, {
            "code": "RATE_LIMIT_EXCEEDED", 
            "message": "Hourly limit reached",
            "reset_at": result.reset_time
        })
```

---

## Working with Richard

### Communication Style
- Be explicit about what you're doing and why
- Provide context for decisions
- Ask questions when uncertain
- Flag potential issues proactively
- Summarize changes clearly

### Review Checkpoints

**Stop and wait for review when:**
1. Confidence rating <8
2. Making database schema changes
3. Changing billing/rate limiting logic
4. Modifying multi-tenant isolation
5. Adding new API endpoints

---

## Common Patterns

### Widget API Endpoint (Python)

```python
@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    client: Client = Depends(validate_api_key),
):
    # Check deployment allowed
    origin = request.headers.get("origin", "")
    if client.tier == "free" and not is_dashboard_origin(origin):
        raise HTTPException(403, detail={
            "code": "DEPLOYMENT_NOT_ALLOWED",
            "message": "Widget deployment requires a paid plan"
        })
    
    # Check rate limit
    rate_result = await check_rate_limit(client.id, client.tier)
    if not rate_result.allowed:
        raise HTTPException(429, detail={
            "code": "RATE_LIMIT_EXCEEDED",
            "message": "Rate limit exceeded"
        })
    
    # Process chat with LangGraph
    workflow = get_widget_workflow()
    result = await workflow.ainvoke({
        "client_id": client.id,
        "tier": client.tier,
        "message": request.message,
        # ...
    })
    
    return ChatResponse(
        response=result["response"],
        session_id=request.session_id,
        sources=result.get("sources")
    )
```

### Dashboard API Endpoint (Express)

```typescript
router.get("/usage", requireAuth, async (req, res) => {
  try {
    const { clientId } = req.auth;
    
    // Always filter by clientId
    const usage = await db.query.usageStats.findMany({
      where: and(
        eq(usageStats.clientId, clientId),
        gte(usageStats.date, startOfMonth)
      ),
      orderBy: desc(usageStats.date)
    });
    
    return res.json({
      success: true,
      data: {
        usage,
        limit: client.hourlyLimit,
        tier: client.tier
      }
    });
  } catch (error) {
    logger.error("Usage fetch error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch usage data"
      }
    });
  }
});
```

---

## Quick Reference

### Project Structure
```
project/
├── client/              # React dashboard
├── server/              # Express API
├── ai-backend/          # Python FastAPI
│   ├── src/
│   │   ├── api/         # Routes
│   │   ├── graph/       # LangGraph
│   │   ├── services/    # Qdrant, Redis, LLM
│   │   └── models/      # Pydantic
├── shared/              # Shared types
├── public/widget/       # widget.js
└── docs/                # Documentation
```

### Essential Commands
```bash
# Start everything
docker-compose up -d

# Dev mode (hot reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Database
npm run db:push
npm run db:studio

# Tests
npm test
cd ai-backend && pytest
```

### Key Documentation
- `docs/ARCHITECTURE.md` - System design
- `docs/BILLING_AND_LIMITS.md` - Pricing, rate limits
- `docs/IMPLEMENTATION_AUDIT.md` - Current state
- `.clinerules` - Project rules

---

## Remember

✅ **Multi-tenant isolation - always filter by clientId**  
✅ **Check tier before deployment and rate limits**  
✅ **Python handles chat, Express handles config**  
✅ **Never omit code - complete implementations only**  
✅ **Type safety in both TypeScript and Python**  
✅ **Ask when uncertain (confidence <8)**  

---

**Quality over speed. Understanding over output. Security over convenience.**
