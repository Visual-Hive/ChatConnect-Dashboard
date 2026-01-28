/**
 * Python Backend Service
 * 
 * Handles communication between Express API and Python AI Backend
 */

import type {
  PythonChatRequest,
  PythonChatResponse,
  ProcessDocumentRequest,
  ProcessDocumentResponse,
  DocumentProgressUpdate,
  ValidateClientRequest,
  ValidateClientResponse,
  PythonHealthResponse,
  PythonErrorResponse,
  PythonBackendConfig,
  DEFAULT_PYTHON_BACKEND_CONFIG,
} from "../../shared/python-backend-types";

// ============================================================================
// CONFIGURATION
// ============================================================================

const config: PythonBackendConfig = {
  url: process.env.PYTHON_BACKEND_URL || DEFAULT_PYTHON_BACKEND_CONFIG.url,
  secret: process.env.PYTHON_BACKEND_SECRET || DEFAULT_PYTHON_BACKEND_CONFIG.secret,
  timeout: parseInt(process.env.PYTHON_BACKEND_TIMEOUT || "30000", 10),
  retryAttempts: parseInt(process.env.PYTHON_BACKEND_RETRY_ATTEMPTS || "2", 10),
  retryDelay: parseInt(process.env.PYTHON_BACKEND_RETRY_DELAY || "1000", 10),
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class PythonBackendError extends Error {
  code: string;
  statusCode: number;
  traceId?: string;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    traceId?: string
  ) {
    super(message);
    this.name = "PythonBackendError";
    this.code = code;
    this.statusCode = statusCode;
    this.traceId = traceId;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Make a request to the Python backend with retry logic
 */
async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retries: number = config.retryAttempts
): Promise<T> {
  const url = `${config.url}${endpoint}`;
  
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Add internal API secret if configured
  if (config.secret) {
    defaultHeaders["X-Internal-Secret"] = config.secret;
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    signal: AbortSignal.timeout(config.timeout),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({})) as PythonErrorResponse;
        
        throw new PythonBackendError(
          errorBody.error?.message || `HTTP ${response.status}`,
          errorBody.error?.code || "UNKNOWN_ERROR",
          response.status,
          errorBody.traceId
        );
      }

      return await response.json() as T;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx)
      if (error instanceof PythonBackendError && error.statusCode < 500) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === retries) {
        break;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, config.retryDelay));
      
      console.warn(
        `Python backend request failed (attempt ${attempt + 1}/${retries + 1}):`,
        lastError.message
      );
    }
  }

  // All retries exhausted
  if (lastError instanceof PythonBackendError) {
    throw lastError;
  }

  throw new PythonBackendError(
    lastError?.message || "Failed to connect to Python backend",
    "SERVICE_UNAVAILABLE",
    503
  );
}

// ============================================================================
// CHAT API
// ============================================================================

/**
 * Send a chat message to the Python backend (non-streaming)
 */
export async function sendChatMessage(
  request: PythonChatRequest
): Promise<PythonChatResponse> {
  return makeRequest<PythonChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Get a streaming chat response URL
 * Returns the URL for the widget to connect directly via SSE
 */
export function getStreamingChatUrl(
  clientId: string,
  sessionId: string
): string {
  const params = new URLSearchParams({
    clientId,
    sessionId,
  });
  return `${config.url}/chat/stream?${params.toString()}`;
}

/**
 * Proxy streaming response from Python backend
 * Used when Express needs to mediate the connection
 */
export async function* streamChatResponse(
  request: PythonChatRequest
): AsyncGenerator<string, void, unknown> {
  const url = `${config.url}/chat/stream`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "text/event-stream",
  };
  
  if (config.secret) {
    headers["X-Internal-Secret"] = config.secret;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(config.timeout),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as PythonErrorResponse;
    throw new PythonBackendError(
      errorBody.error?.message || `HTTP ${response.status}`,
      errorBody.error?.code || "UNKNOWN_ERROR",
      response.status,
      errorBody.traceId
    );
  }

  if (!response.body) {
    throw new PythonBackendError(
      "No response body",
      "SERVICE_UNAVAILABLE",
      503
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      yield chunk;
    }
  } finally {
    reader.releaseLock();
  }
}

// ============================================================================
// DOCUMENT PROCESSING API
// ============================================================================

/**
 * Send a document to the Python backend for processing
 */
export async function processDocument(
  request: ProcessDocumentRequest
): Promise<ProcessDocumentResponse> {
  return makeRequest<ProcessDocumentResponse>("/process-document", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Get document processing status
 */
export async function getDocumentStatus(
  documentId: string
): Promise<DocumentProgressUpdate> {
  return makeRequest<DocumentProgressUpdate>(`/documents/${documentId}/status`, {
    method: "GET",
  });
}

// ============================================================================
// VALIDATION API
// ============================================================================

/**
 * Validate a client API key with the Python backend
 * Used for additional validation or when Python backend manages client data
 */
export async function validateClient(
  request: ValidateClientRequest
): Promise<ValidateClientResponse> {
  return makeRequest<ValidateClientResponse>("/internal/validate-client", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// ============================================================================
// HEALTH API
// ============================================================================

/**
 * Check Python backend health
 */
export async function checkHealth(): Promise<PythonHealthResponse> {
  return makeRequest<PythonHealthResponse>("/health", {
    method: "GET",
  }, 0); // No retries for health check
}

/**
 * Check if Python backend is available
 */
export async function isAvailable(): Promise<boolean> {
  try {
    const health = await checkHealth();
    return health.status === "healthy" || health.status === "degraded";
  } catch {
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const pythonBackend = {
  // Chat
  sendChatMessage,
  getStreamingChatUrl,
  streamChatResponse,
  
  // Documents
  processDocument,
  getDocumentStatus,
  
  // Validation
  validateClient,
  
  // Health
  checkHealth,
  isAvailable,
  
  // Configuration
  config,
};

export default pythonBackend;
