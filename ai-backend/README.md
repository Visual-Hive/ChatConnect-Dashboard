# ChatConnect AI Backend

Widget Light - Simplified AI chat backend for embedded widgets.

## Overview

This is the Python FastAPI backend that handles:
- Chat message processing (RAG with Qdrant)
- LLM responses (GPT-4o-mini for free tier, Claude Sonnet 4.5 for paid tier)
- Document processing (parse, chunk, embed)
- Usage tracking and logging

## Quick Start

### With Docker (Recommended)

```bash
# From project root
docker-compose up -d
```

### Local Development

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Run with hot reload
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/widget/chat` | POST | Process chat (non-streaming) |
| `/api/widget/chat/stream` | POST | Process chat (SSE streaming) |
| `/api/widget/process-document` | POST | Process uploaded document |
| `/api/widget/documents/{id}/status` | GET | Get processing status |

## Environment Variables

See `.env.example` in the project root for all configuration options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `QDRANT_URL` - Qdrant connection string
- `OPENAI_API_KEY` - For GPT-4o-mini and embeddings
- `ANTHROPIC_API_KEY` - For Claude Sonnet 4.5 (paid tier)

## Project Structure

```
ai-backend/
├── src/
│   ├── api/
│   │   ├── main.py          # FastAPI app
│   │   └── routes.py        # API endpoints
│   ├── config/
│   │   └── settings.py      # Environment config
│   ├── models/
│   │   ├── requests.py      # Request models
│   │   └── responses.py     # Response models
│   ├── services/            # External service clients
│   ├── graph/               # LangGraph workflows
│   │   └── nodes/widget/    # Widget-specific nodes
│   └── monitoring/          # Metrics and logging
├── tests/
├── pyproject.toml
├── Dockerfile
└── Dockerfile.dev
```

## Testing

```bash
pytest
```

## TODO

- [ ] Implement Qdrant service
- [ ] Implement LLM service (Anthropic + OpenAI)
- [ ] Implement Redis caching
- [ ] Implement LangGraph workflow
- [ ] Implement document processing pipeline
- [ ] Add database connection pool
- [ ] Add rate limiting
- [ ] Add Prometheus metrics
