"""
API Routes for ChatConnect Widget Light Backend.

Endpoints:
- POST /api/widget/chat - Process chat message (non-streaming)
- POST /api/widget/chat/stream - Process chat message (SSE streaming)
- POST /api/widget/process-document - Process uploaded document
- GET /api/widget/documents/{id}/status - Get document processing status
"""

import json
import time
import uuid
from typing import AsyncGenerator

import structlog
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse

from src.models.requests import ChatRequest, ProcessDocumentRequest
from src.models.responses import ChatResponse, DocumentStatusResponse

logger = structlog.get_logger()

router = APIRouter(prefix="/api/widget", tags=["widget"])


# =============================================================================
# Dependencies
# =============================================================================

async def validate_api_key(x_api_key: str = Header(..., alias="x-api-key")) -> dict:
    """
    Validate API key and return client configuration.
    
    TODO: Actually validate against database.
    """
    if not x_api_key or not x_api_key.startswith("pk_"):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # TODO: Look up client in database
    # For now, return mock config
    return {
        "client_id": "mock_client_123",
        "tier": "free",  # or "paid"
        "model": "gpt-4o-mini",  # or "claude-sonnet-4-5-20250514"
        "system_prompt": None,
    }


async def validate_internal_secret(
    x_internal_secret: str = Header(None, alias="X-Internal-Secret")
) -> bool:
    """Validate internal API secret for Express -> Python calls."""
    from src.config.settings import settings
    
    if x_internal_secret != settings.internal_api_secret:
        raise HTTPException(status_code=401, detail="Invalid internal secret")
    
    return True


# =============================================================================
# Chat Endpoints
# =============================================================================

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    client_config: dict = Depends(validate_api_key),
):
    """
    Process chat message (non-streaming).
    
    1. Validate API key
    2. Search Qdrant for relevant context
    3. Generate response with LLM
    4. Log conversation (async)
    5. Return response
    """
    trace_id = str(uuid.uuid4())
    start_time = time.time()
    
    logger.info(
        "chat_request_received",
        trace_id=trace_id,
        client_id=client_config["client_id"],
        message_length=len(request.message),
    )
    
    try:
        # TODO: Implement actual workflow
        # For now, return mock response
        
        # Simulate processing time
        import asyncio
        await asyncio.sleep(0.5)
        
        response_text = (
            f"This is a mock response. Your message was: '{request.message[:50]}...'\n\n"
            f"Client tier: {client_config['tier']}\n"
            f"Model: {client_config['model']}\n\n"
            "The actual implementation will:\n"
            "1. Search your knowledge base for relevant context\n"
            "2. Generate a response using the appropriate LLM\n"
            "3. Return sources for the information provided"
        )
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        logger.info(
            "chat_request_completed",
            trace_id=trace_id,
            latency_ms=latency_ms,
        )
        
        return ChatResponse(
            response=response_text,
            session_id=request.session_id,
            sources=[],
            trace_id=trace_id,
        )
        
    except Exception as e:
        logger.error(
            "chat_request_failed",
            trace_id=trace_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail="Failed to process chat request")


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    client_config: dict = Depends(validate_api_key),
):
    """
    Process chat message with SSE streaming.
    
    Returns Server-Sent Events:
    - event: start - Stream started
    - event: chunk - Text chunk
    - event: sources - Source references
    - event: done - Stream completed
    """
    trace_id = str(uuid.uuid4())
    
    logger.info(
        "chat_stream_request_received",
        trace_id=trace_id,
        client_id=client_config["client_id"],
    )
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        """Generate SSE stream."""
        try:
            # Send start event
            yield f"event: start\ndata: {trace_id}\n\n"
            
            # TODO: Implement actual streaming workflow
            # For now, simulate streaming response
            
            mock_response = (
                f"This is a mock streaming response. "
                f"Your message was: '{request.message[:30]}...'\n\n"
                f"The actual implementation will stream tokens from the LLM in real-time."
            )
            
            # Stream response in chunks
            chunk_size = 10
            for i in range(0, len(mock_response), chunk_size):
                chunk = mock_response[i:i + chunk_size]
                yield f"event: chunk\ndata: {chunk}\n\n"
                
                # Small delay to simulate streaming
                import asyncio
                await asyncio.sleep(0.05)
            
            # Send sources (empty for mock)
            yield f"event: sources\ndata: {json.dumps([])}\n\n"
            
            # Send done event
            yield "event: done\ndata: [DONE]\n\n"
            
            logger.info(
                "chat_stream_completed",
                trace_id=trace_id,
            )
            
        except Exception as e:
            logger.error(
                "chat_stream_error",
                trace_id=trace_id,
                error=str(e),
            )
            yield f"event: error\ndata: {json.dumps({'code': 'STREAM_ERROR', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# =============================================================================
# Document Processing Endpoints
# =============================================================================

@router.post("/process-document")
async def process_document(
    request: ProcessDocumentRequest,
    _: bool = Depends(validate_internal_secret),
):
    """
    Process uploaded document.
    
    Called by Express API after file upload.
    
    1. Parse document (PDF, DOCX, TXT, CSV)
    2. Chunk text
    3. Generate embeddings
    4. Store in Qdrant
    5. Update status in PostgreSQL
    """
    trace_id = str(uuid.uuid4())
    
    logger.info(
        "document_process_request",
        trace_id=trace_id,
        document_id=request.document_id,
        client_id=request.client_id,
        file_type=request.file_type,
    )
    
    # TODO: Implement actual document processing
    # For now, return mock response
    
    return {
        "success": True,
        "document_id": request.document_id,
        "trace_id": trace_id,
        "status": "processing",
        "message": "Document processing started",
    }


@router.get("/documents/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: str,
    _: bool = Depends(validate_internal_secret),
):
    """Get document processing status."""
    
    # TODO: Look up actual status from database
    
    return DocumentStatusResponse(
        document_id=document_id,
        status="completed",
        progress=100,
        chunks_total=10,
        chunks_processed=10,
    )


# =============================================================================
# Internal Endpoints (Express -> Python)
# =============================================================================

@router.post("/internal/validate-client")
async def validate_client(
    api_key: str,
    _: bool = Depends(validate_internal_secret),
):
    """
    Validate client API key.
    
    Called by Express to verify API key is valid.
    """
    # TODO: Actually validate against database
    
    if not api_key or not api_key.startswith("pk_"):
        return {
            "valid": False,
            "error_message": "Invalid API key format",
        }
    
    return {
        "valid": True,
        "client_id": "mock_client_123",
        "tier": "free",
        "model": "gpt-4o-mini",
        "allowed_domains": ["*"],
    }
