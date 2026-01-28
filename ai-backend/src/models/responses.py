"""
Response models for ChatConnect AI Backend.
"""

from typing import Literal

from pydantic import BaseModel


class ChatSource(BaseModel):
    """Source reference in chat response."""
    
    document_id: str
    title: str
    excerpt: str
    score: float


class ChatResponse(BaseModel):
    """Chat response to widget."""
    
    response: str
    session_id: str
    sources: list[ChatSource] | None = None
    trace_id: str


class DocumentStatusResponse(BaseModel):
    """Document processing status response."""
    
    document_id: str
    status: Literal["pending", "parsing", "chunking", "embedding", "completed", "failed"]
    progress: int  # 0-100
    current_step: str | None = None
    chunks_total: int | None = None
    chunks_processed: int | None = None
    error_message: str | None = None


class HealthResponse(BaseModel):
    """Health check response."""
    
    status: Literal["healthy", "degraded", "unhealthy"]
    timestamp: float
    version: str
    services: dict[str, bool]
