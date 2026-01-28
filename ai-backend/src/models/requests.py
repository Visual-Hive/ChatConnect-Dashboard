"""
Request models for ChatConnect AI Backend.
"""

from typing import Any

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Chat request from widget."""
    
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(..., pattern=r"^[a-f0-9-]{36}$")
    metadata: dict[str, Any] | None = None


class ProcessDocumentRequest(BaseModel):
    """Document processing request from Express."""
    
    document_id: str
    client_id: str
    file_data: str  # Base64 encoded
    file_type: str = Field(..., pattern=r"^(pdf|docx|txt|csv)$")
    original_name: str
    metadata: dict[str, Any] | None = None
