# Central Assistant - Widget Light Backend Module

**Version:** 1.0  
**Created:** January 2025  
**Status:** Planning

---

## Overview

This document outlines adding a "Widget Light" module to the existing Central Assistant Python backend. This module provides a simplified AI chat backend for the ChatConnect Dashboard SaaS product.

**Key Principle:** Reuse existing infrastructure (Qdrant, Redis, LLM services) but with a simplified workflow designed for embedded widget use cases.

---

## Architecture: Widget Light vs Main Assistant

| Aspect | Main Assistant | Widget Light |
|--------|---------------|--------------|
| **Use Case** | Full conference assistant | Simple Q&A widget |
| **LangGraph Nodes** | 8 nodes | 3 nodes |
| **User Profiles** | Yes (Directus) | No |
| **Faceted Search** | Yes (8 facets) | No (simple vector) |
| **Conversation History** | Yes (stored) | Session only |
| **Attendee Matching** | Yes | No |
| **LLM Models** | Claude Sonnet 4.5 | Sonnet (paid) / GPT-4o-mini (free) |
| **Multi-tenant** | Single conference | Many clients |

---

## Directory Structure

Add to existing central-assistant repo:

```
src/
├── api/
│   ├── main.py                 # Existing FastAPI app
│   ├── routes.py               # Existing routes
│   └── widget_routes.py        # NEW: Widget Light routes
│
├── graph/
│   ├── state.py                # Existing main state
│   ├── graph.py                # Existing main workflow
│   ├── widget_state.py         # NEW: Widget state (simplified)
│   └── widget_workflow.py      # NEW: Widget workflow (3 nodes)
│
├── graph/nodes/
│   ├── ... existing nodes ...
│   └── widget/                 # NEW: Widget-specific nodes
│       ├── __init__.py
│       ├── retrieve.py         # Simple vector search
│       ├── generate.py         # LLM with tier selection
│       └── log.py              # Async logging
│
├── services/
│   ├── ... existing services ...
│   └── widget_client.py        # NEW: Widget client management
│
├── models/
│   ├── ... existing models ...
│   ├── widget_requests.py      # NEW: Widget request models
│   └── widget_responses.py     # NEW: Widget response models
│
└── config/
    ├── settings.py             # Add widget settings
    └── prompts/
        ├── ... existing prompts ...
        └── widget_assistant.txt # NEW: Widget system prompt
```

---

## Task 1: Widget State Definition

**File:** `src/graph/widget_state.py`

```python
"""
Widget Light State Definition

Simplified state for embedded widget chat.
No user profiles, no faceted search, no attendee matching.
"""

from typing import TypedDict, List, Optional
import time


class WidgetChatState(TypedDict):
    """
    Minimal state for widget chat workflow.
    
    Compared to main AssistantState (25+ fields), this has only
    the essentials for simple Q&A.
    """
    
    # === Request ===
    trace_id: str
    client_id: str          # Multi-tenant: which client owns this widget
    session_id: str         # Widget session (ephemeral)
    message: str            # User's question
    
    # === Client Config ===
    tier: str               # "free" | "paid"
    model: str              # LLM model to use
    system_prompt: Optional[str]  # Custom system prompt
    
    # === Retrieved Context ===
    context_chunks: List[dict]  # Qdrant search results
    # Each chunk: { content, document_id, score, metadata }
    
    # === Response ===
    response: str           # Generated response
    sources: List[dict]     # Source references
    # Each source: { document_id, title, excerpt, score }
    
    # === Metadata ===
    started_at: float
    completed_at: Optional[float]
    tokens_used: Optional[dict]  # { prompt, completion, total, cached }
    latency_ms: Optional[int]
    
    # === Error ===
    error: Optional[str]
    error_code: Optional[str]
```

---

## Task 2: Widget Workflow

**File:** `src/graph/widget_workflow.py`

```python
"""
Widget Light Workflow

3-node LangGraph workflow:
1. retrieve - Search Qdrant for relevant context
2. generate - Generate response with LLM
3. log - Async log to database (non-blocking)
"""

from langgraph.graph import StateGraph, END
from structlog import get_logger

from src.graph.widget_state import WidgetChatState
from src.graph.nodes.widget import retrieve, generate, log

logger = get_logger()


def create_widget_workflow() -> StateGraph:
    """
    Create the widget chat workflow.
    
    Flow:
        START → retrieve → generate → log → END
    
    No conditional routing, no retries (keep it simple).
    Error handling at node level.
    """
    
    workflow = StateGraph(WidgetChatState)
    
    # Add nodes
    workflow.add_node("retrieve", retrieve.retrieve_context)
    workflow.add_node("generate", generate.generate_response)
    workflow.add_node("log", log.log_conversation)
    
    # Define edges (simple linear flow)
    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "generate")
    workflow.add_edge("generate", "log")
    workflow.add_edge("log", END)
    
    return workflow.compile()


# Singleton workflow instance
_widget_workflow = None


def get_widget_workflow() -> StateGraph:
    """Get or create the widget workflow singleton."""
    global _widget_workflow
    
    if _widget_workflow is None:
        logger.info("creating_widget_workflow")
        _widget_workflow = create_widget_workflow()
    
    return _widget_workflow
```

---

## Task 3: Retrieve Node

**File:** `src/graph/nodes/widget/retrieve.py`

```python
"""
Widget Retrieve Node

Simple vector search in Qdrant.
No faceted search, no profile matching.
"""

from typing import List
from structlog import get_logger

from src.graph.widget_state import WidgetChatState
from src.services.qdrant import qdrant_service
from src.services.embeddings import embed_text
from src.monitoring.metrics import WIDGET_SEARCH_DURATION

logger = get_logger()

# Collection name for widget documents
WIDGET_COLLECTION = "chatconnect_documents"

# Search configuration
DEFAULT_LIMIT = 5
DEFAULT_SCORE_THRESHOLD = 0.7


async def retrieve_context(state: WidgetChatState) -> WidgetChatState:
    """
    Search Qdrant for relevant context.
    
    Simple flow:
    1. Embed user query
    2. Search Qdrant with client_id filter
    3. Return top chunks
    """
    
    trace_id = state["trace_id"]
    client_id = state["client_id"]
    message = state["message"]
    
    logger.info(
        "widget_retrieve_start",
        trace_id=trace_id,
        client_id=client_id,
        query_length=len(message)
    )
    
    try:
        with WIDGET_SEARCH_DURATION.time():
            # 1. Embed query
            query_embedding = await embed_text(message)
            
            # 2. Search Qdrant with client_id filter
            results = await qdrant_service.search(
                collection_name=WIDGET_COLLECTION,
                query_vector=query_embedding,
                query_filter={
                    "must": [
                        {"key": "client_id", "match": {"value": client_id}}
                    ]
                },
                limit=DEFAULT_LIMIT,
                score_threshold=DEFAULT_SCORE_THRESHOLD,
                with_payload=True
            )
        
        # 3. Format results
        context_chunks = [
            {
                "content": hit.payload.get("content", ""),
                "document_id": hit.payload.get("document_id"),
                "title": hit.payload.get("title", ""),
                "score": hit.score,
                "chunk_index": hit.payload.get("chunk_index", 0),
                "metadata": hit.payload.get("metadata", {})
            }
            for hit in results
        ]
        
        logger.info(
            "widget_retrieve_complete",
            trace_id=trace_id,
            results_count=len(context_chunks)
        )
        
        return {**state, "context_chunks": context_chunks}
        
    except Exception as e:
        logger.error(
            "widget_retrieve_error",
            trace_id=trace_id,
            error=str(e)
        )
        
        # Return empty context on error (generate node will handle)
        return {**state, "context_chunks": [], "error": str(e)}
```

---

## Task 4: Generate Node

**File:** `src/graph/nodes/widget/generate.py`

```python
"""
Widget Generate Node

Generate response using appropriate LLM based on client tier.
- Free tier: GPT-4o-mini
- Paid tier: Claude Sonnet 4.5

Uses prompt caching for cost efficiency.
"""

import time
from typing import AsyncGenerator
from structlog import get_logger

from src.graph.widget_state import WidgetChatState
from src.services.anthropic import call_claude_with_cache, stream_claude_with_cache
from src.services.openai_service import call_gpt, stream_gpt
from src.config import prompts
from src.monitoring.metrics import WIDGET_LLM_TOKENS, WIDGET_GENERATE_DURATION

logger = get_logger()

# Default system prompt (used if client hasn't customized)
DEFAULT_SYSTEM_PROMPT = """You are a helpful assistant for a website.
Answer questions based on the provided context.
If you don't have enough information, say so politely.
Keep responses concise and helpful."""


async def generate_response(state: WidgetChatState) -> WidgetChatState:
    """
    Generate response using LLM.
    
    Selects model based on client tier:
    - free: gpt-4o-mini
    - paid: claude-sonnet-4-5-20250514
    """
    
    trace_id = state["trace_id"]
    tier = state["tier"]
    model = state["model"]
    message = state["message"]
    context_chunks = state["context_chunks"]
    custom_prompt = state.get("system_prompt")
    
    logger.info(
        "widget_generate_start",
        trace_id=trace_id,
        tier=tier,
        model=model,
        context_count=len(context_chunks)
    )
    
    start_time = time.time()
    
    try:
        # Build context string
        context_str = _build_context(context_chunks)
        
        # Get system prompt
        system_prompt = custom_prompt or DEFAULT_SYSTEM_PROMPT
        
        # Build user message with context
        user_message = f"""Context:
{context_str}

Question: {message}

Please answer based on the context provided."""
        
        # Call appropriate LLM
        if tier == "paid" and "claude" in model:
            response, usage = await _call_claude(system_prompt, user_message, trace_id)
        else:
            response, usage = await _call_gpt(system_prompt, user_message, trace_id)
        
        # Calculate latency
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Build sources from context
        sources = _build_sources(context_chunks)
        
        # Track metrics
        WIDGET_LLM_TOKENS.labels(model=model, type="prompt").inc(usage.get("prompt", 0))
        WIDGET_LLM_TOKENS.labels(model=model, type="completion").inc(usage.get("completion", 0))
        WIDGET_GENERATE_DURATION.labels(model=model).observe(latency_ms / 1000)
        
        logger.info(
            "widget_generate_complete",
            trace_id=trace_id,
            latency_ms=latency_ms,
            tokens=usage
        )
        
        return {
            **state,
            "response": response,
            "sources": sources,
            "tokens_used": usage,
            "latency_ms": latency_ms,
            "completed_at": time.time()
        }
        
    except Exception as e:
        logger.error(
            "widget_generate_error",
            trace_id=trace_id,
            error=str(e)
        )
        
        return {
            **state,
            "response": "I apologize, but I encountered an error. Please try again.",
            "sources": [],
            "error": str(e),
            "error_code": "GENERATION_ERROR"
        }


def _build_context(chunks: list) -> str:
    """Build context string from chunks."""
    if not chunks:
        return "No relevant context found."
    
    parts = []
    for i, chunk in enumerate(chunks, 1):
        title = chunk.get("title", f"Document {i}")
        content = chunk.get("content", "")
        parts.append(f"[{title}]\n{content}")
    
    return "\n\n---\n\n".join(parts)


def _build_sources(chunks: list) -> list:
    """Build sources list from chunks."""
    sources = []
    seen_docs = set()
    
    for chunk in chunks:
        doc_id = chunk.get("document_id")
        if doc_id and doc_id not in seen_docs:
            seen_docs.add(doc_id)
            sources.append({
                "documentId": doc_id,
                "title": chunk.get("title", "Untitled"),
                "excerpt": chunk.get("content", "")[:200] + "...",
                "score": chunk.get("score", 0)
            })
    
    return sources


async def _call_claude(system_prompt: str, user_message: str, trace_id: str):
    """Call Claude with prompt caching."""
    response = await call_claude_with_cache(
        prompt_name="widget_assistant",
        static_prompt=system_prompt,
        user_message=user_message,
        temperature=0.7,
        max_tokens=1000
    )
    
    # Extract usage from response
    usage = {
        "prompt": response.usage.input_tokens,
        "completion": response.usage.output_tokens,
        "total": response.usage.input_tokens + response.usage.output_tokens,
        "cached": getattr(response.usage, "cache_read_input_tokens", 0) > 0
    }
    
    return response.content[0].text, usage


async def _call_gpt(system_prompt: str, user_message: str, trace_id: str):
    """Call GPT-4o-mini."""
    response = await call_gpt(
        model="gpt-4o-mini",
        system_prompt=system_prompt,
        user_message=user_message,
        temperature=0.7,
        max_tokens=1000
    )
    
    usage = {
        "prompt": response.usage.prompt_tokens,
        "completion": response.usage.completion_tokens,
        "total": response.usage.total_tokens,
        "cached": False  # GPT doesn't have prompt caching
    }
    
    return response.choices[0].message.content, usage
```

---

## Task 5: Log Node

**File:** `src/graph/nodes/widget/log.py`

```python
"""
Widget Log Node

Async logging to PostgreSQL.
Non-blocking - errors don't affect response.
"""

import asyncio
from structlog import get_logger

from src.graph.widget_state import WidgetChatState
from src.services.postgres import postgres_service

logger = get_logger()


async def log_conversation(state: WidgetChatState) -> WidgetChatState:
    """
    Log conversation to PostgreSQL.
    
    Runs asynchronously and doesn't block response.
    Errors are logged but don't affect the workflow.
    """
    
    trace_id = state["trace_id"]
    
    # Fire and forget - don't await
    asyncio.create_task(_do_log(state))
    
    logger.debug("widget_log_scheduled", trace_id=trace_id)
    
    return state


async def _do_log(state: WidgetChatState):
    """Actually perform the logging."""
    
    trace_id = state["trace_id"]
    
    try:
        # Log user message
        await postgres_service.insert_chat_log({
            "client_id": state["client_id"],
            "session_id": state["session_id"],
            "role": "user",
            "content": state["message"],
            "trace_id": trace_id
        })
        
        # Log assistant message
        await postgres_service.insert_chat_log({
            "client_id": state["client_id"],
            "session_id": state["session_id"],
            "role": "assistant",
            "content": state["response"],
            "sources": state.get("sources"),
            "prompt_tokens": state.get("tokens_used", {}).get("prompt"),
            "completion_tokens": state.get("tokens_used", {}).get("completion"),
            "total_tokens": state.get("tokens_used", {}).get("total"),
            "cached": state.get("tokens_used", {}).get("cached", False),
            "model": state["model"],
            "latency_ms": state.get("latency_ms"),
            "trace_id": trace_id
        })
        
        # Update usage stats (daily aggregation)
        await postgres_service.update_usage_stats(
            client_id=state["client_id"],
            tokens=state.get("tokens_used", {}),
            latency_ms=state.get("latency_ms")
        )
        
        logger.debug("widget_log_complete", trace_id=trace_id)
        
    except Exception as e:
        # Log error but don't propagate
        logger.error(
            "widget_log_error",
            trace_id=trace_id,
            error=str(e)
        )
```

---

## Task 6: Widget API Routes

**File:** `src/api/widget_routes.py`

```python
"""
Widget Light API Routes

Endpoints for ChatConnect widget chat.
Separate from main assistant routes.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from structlog import get_logger
import time
import uuid

from src.graph.widget_workflow import get_widget_workflow
from src.graph.widget_state import WidgetChatState
from src.models.widget_requests import WidgetChatRequest
from src.models.widget_responses import WidgetChatResponse
from src.services.widget_client import get_client_config, validate_api_key
from src.api.dependencies import get_internal_secret

logger = get_logger()
router = APIRouter(prefix="/widget", tags=["widget"])


@router.post("/chat", response_model=WidgetChatResponse)
async def chat(
    request: WidgetChatRequest,
    api_key: str = Depends(validate_api_key)
):
    """
    Process chat message (non-streaming).
    
    Validates API key, runs workflow, returns response.
    """
    
    trace_id = str(uuid.uuid4())
    
    logger.info(
        "widget_chat_request",
        trace_id=trace_id,
        message_length=len(request.message)
    )
    
    # Get client config from API key
    client_config = await get_client_config(api_key)
    
    if not client_config:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Build initial state
    state: WidgetChatState = {
        "trace_id": trace_id,
        "client_id": client_config["client_id"],
        "session_id": request.session_id,
        "message": request.message,
        "tier": client_config["tier"],
        "model": client_config["model"],
        "system_prompt": client_config.get("system_prompt"),
        "context_chunks": [],
        "response": "",
        "sources": [],
        "started_at": time.time(),
        "completed_at": None,
        "tokens_used": None,
        "latency_ms": None,
        "error": None,
        "error_code": None
    }
    
    # Run workflow
    workflow = get_widget_workflow()
    result = await workflow.ainvoke(state)
    
    # Check for errors
    if result.get("error_code"):
        logger.warning(
            "widget_chat_error",
            trace_id=trace_id,
            error_code=result["error_code"]
        )
    
    return WidgetChatResponse(
        response=result["response"],
        session_id=result["session_id"],
        sources=result.get("sources"),
        trace_id=trace_id
    )


@router.post("/chat/stream")
async def chat_stream(
    request: WidgetChatRequest,
    api_key: str = Depends(validate_api_key)
):
    """
    Process chat message with SSE streaming.
    """
    
    trace_id = str(uuid.uuid4())
    
    # Get client config
    client_config = await get_client_config(api_key)
    
    if not client_config:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    async def generate_stream():
        # Stream implementation...
        yield f"event: start\ndata: {trace_id}\n\n"
        
        # TODO: Implement streaming workflow
        # For now, run normal workflow and stream result
        
        state: WidgetChatState = {
            "trace_id": trace_id,
            "client_id": client_config["client_id"],
            "session_id": request.session_id,
            "message": request.message,
            "tier": client_config["tier"],
            "model": client_config["model"],
            "system_prompt": client_config.get("system_prompt"),
            "context_chunks": [],
            "response": "",
            "sources": [],
            "started_at": time.time(),
            "completed_at": None,
            "tokens_used": None,
            "latency_ms": None,
            "error": None,
            "error_code": None
        }
        
        workflow = get_widget_workflow()
        result = await workflow.ainvoke(state)
        
        # Stream response in chunks (simulated for now)
        response = result["response"]
        chunk_size = 20
        
        for i in range(0, len(response), chunk_size):
            chunk = response[i:i+chunk_size]
            yield f"event: chunk\ndata: {chunk}\n\n"
        
        # Send sources
        if result.get("sources"):
            import json
            yield f"event: sources\ndata: {json.dumps(result['sources'])}\n\n"
        
        yield "event: done\ndata: [DONE]\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/health")
async def health():
    """Widget-specific health check."""
    return {
        "status": "healthy",
        "service": "widget-light",
        "timestamp": time.time()
    }
```

---

## Task 7: Integration with Main App

**File:** `src/api/main.py` (update)

```python
# Add to existing main.py

from src.api.widget_routes import router as widget_router

# Include widget routes
app.include_router(widget_router, prefix="/api")

# Widget routes will be available at:
# POST /api/widget/chat
# POST /api/widget/chat/stream
# GET /api/widget/health
```

---

## Configuration Updates

**File:** `src/config/settings.py` (add)

```python
class WidgetSettings(BaseSettings):
    """Widget-specific settings."""
    
    # Qdrant collection for widget documents
    widget_collection: str = "chatconnect_documents"
    
    # Default search settings
    widget_search_limit: int = 5
    widget_score_threshold: float = 0.7
    
    # LLM defaults
    widget_max_tokens: int = 1000
    widget_temperature: float = 0.7
    
    # Rate limiting
    widget_rate_limit_free: int = 100  # per minute
    widget_rate_limit_paid: int = 1000  # per minute
    
    class Config:
        env_prefix = "WIDGET_"
```

---

## Summary

| Task | Duration | Priority |
|------|----------|----------|
| Task 1: Widget State | 1 hour | P0 |
| Task 2: Widget Workflow | 1-2 hours | P0 |
| Task 3: Retrieve Node | 2 hours | P0 |
| Task 4: Generate Node | 3-4 hours | P0 |
| Task 5: Log Node | 1-2 hours | P1 |
| Task 6: API Routes | 2-3 hours | P0 |
| Task 7: Integration | 1 hour | P0 |

**Total: ~12-15 hours**

---

## Benefits of This Approach

1. **Reuses existing infrastructure** - Qdrant, Redis, LLM services all shared
2. **Separate concerns** - Widget logic isolated from main assistant
3. **Easy to maintain** - Simple 3-node workflow vs 8-node main workflow
4. **Scalable** - Can run more widget workers independently
5. **Cost efficient** - Prompt caching shared, tiered model selection

---

## Next Steps

1. Create the directory structure
2. Implement state and workflow
3. Implement nodes (retrieve → generate → log)
4. Add API routes
5. Test with ChatConnect Express API
6. Deploy alongside main assistant
