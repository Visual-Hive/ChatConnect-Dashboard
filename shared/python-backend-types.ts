/**
 * Python Backend Communication Types
 * 
 * Types for communication between Express API and Python AI Backend
 */

// ============================================================================
// CLIENT & TIER TYPES
// ============================================================================

export type ClientTier = "free" | "paid";

export type LLMModel = "gpt-4o-mini" | "claude-sonnet-4-5-20250514";

export interface ClientConfig {
  clientId: string;
  tier: ClientTier;
  model: LLMModel;
  maxTokensPerRequest: number;
  maxRequestsPerMinute: number;
}

// ============================================================================
// CHAT REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request sent from widget to Python backend
 */
export interface PythonChatRequest {
  clientId: string;
  message: string;
  sessionId: string;
  metadata?: {
    userAgent?: string;
    pageUrl?: string;
    customFields?: Record<string, unknown>;
  };
}

/**
 * Response from Python backend (non-streaming)
 */
export interface PythonChatResponse {
  response: string;
  sessionId: string;
  sources?: ChatSource[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cached: boolean;
  };
  traceId: string;
}

/**
 * Source reference in chat response
 */
export interface ChatSource {
  documentId: string;
  title: string;
  excerpt: string;
  score: number;
  chunkIndex: number;
}

/**
 * SSE event types for streaming responses
 */
export type SSEEventType = 
  | "start"        // Stream started
  | "chunk"        // Response text chunk
  | "sources"      // Source references
  | "usage"        // Token usage stats
  | "done"         // Stream completed
  | "error";       // Error occurred

/**
 * SSE event payload
 */
export interface SSEEvent {
  event: SSEEventType;
  data: string | ChatSource[] | TokenUsage | ErrorPayload;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cached: boolean;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

// ============================================================================
// DOCUMENT PROCESSING TYPES
// ============================================================================

export type FileType = "pdf" | "docx" | "txt" | "csv";

export type ProcessingStatus = 
  | "pending"
  | "parsing"
  | "chunking"
  | "embedding"
  | "storing"
  | "completed"
  | "failed";

/**
 * Request to process a document
 */
export interface ProcessDocumentRequest {
  documentId: string;
  clientId: string;
  fileData: string;  // Base64 encoded
  fileType: FileType;
  originalName: string;
  metadata?: Record<string, unknown>;
}

/**
 * Progress update from Python backend
 */
export interface DocumentProgressUpdate {
  documentId: string;
  status: ProcessingStatus;
  progress: number;  // 0-100
  currentStep?: string;
  chunksTotal?: number;
  chunksProcessed?: number;
  qdrantPointIds?: string[];
  errorMessage?: string;
}

/**
 * Final processing result
 */
export interface ProcessDocumentResponse {
  success: boolean;
  documentId: string;
  chunksCreated: number;
  qdrantPointIds: string[];
  processingTimeMs: number;
  errorMessage?: string;
}

// ============================================================================
// INTERNAL API TYPES (Express <-> Python)
// ============================================================================

/**
 * Validate client request
 */
export interface ValidateClientRequest {
  apiKey: string;
}

export interface ValidateClientResponse {
  valid: boolean;
  clientId?: string;
  tier?: ClientTier;
  model?: LLMModel;
  allowedDomains?: string[];
  errorMessage?: string;
}

/**
 * Health check response
 */
export interface PythonHealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  queueSize: number;
  queueCapacity: number;
  services: {
    qdrant: boolean;
    redis: boolean;
    anthropic: boolean;
    openai: boolean;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type PythonErrorCode =
  | "INVALID_API_KEY"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "INVALID_REQUEST"
  | "PROCESSING_ERROR"
  | "LLM_ERROR"
  | "VECTOR_SEARCH_ERROR"
  | "TIMEOUT"
  | "SERVICE_UNAVAILABLE";

export interface PythonErrorResponse {
  error: {
    code: PythonErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  traceId?: string;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Python backend configuration (from environment)
 */
export interface PythonBackendConfig {
  url: string;
  secret: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Default configuration
 */
export const DEFAULT_PYTHON_BACKEND_CONFIG: PythonBackendConfig = {
  url: process.env.PYTHON_BACKEND_URL || "http://localhost:8000",
  secret: process.env.PYTHON_BACKEND_SECRET || "",
  timeout: 30000,  // 30 seconds
  retryAttempts: 2,
  retryDelay: 1000,  // 1 second
};
