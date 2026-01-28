/**
 * Widget API Routes - V2
 * 
 * Updated to use Python backend for chat processing instead of n8n
 */

import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { authenticateWidget, type AuthenticatedWidgetRequest } from "../middleware/widget-auth";
import { storage } from "../storage";
import { pythonBackend, PythonBackendError } from "../services/python-backend";
import type { PythonChatRequest, ChatSource } from "../../shared/python-backend-types";

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for validating chat request payloads
 */
const chatRequestSchema = z.object({
  message: z.string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message cannot exceed 2000 characters"),
  sessionId: z.string()
    .uuid("Session ID must be a valid UUID"),
  metadata: z.object({
    userAgent: z.string().optional(),
    pageUrl: z.string().url().optional(),
    customFields: z.record(z.any()).optional(),
  }).optional(),
});

type ChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * Schema for chat response
 */
interface ChatResponse {
  response: string;
  sessionId: string;
  sources?: ChatSource[];
}

/**
 * Schema for widget configuration response
 */
interface WidgetConfigResponse {
  widget: {
    primaryColor: string;
    position: string;
    welcomeMessage: string;
    widgetName: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get default widget configuration
 */
function getDefaultWidgetConfig(): WidgetConfigResponse {
  return {
    widget: {
      primaryColor: "#3b82f6",
      position: "bottom-right",
      welcomeMessage: "Hi! How can I help?",
      widgetName: "Support",
    },
  };
}

/**
 * Map Python backend errors to HTTP responses
 */
function handlePythonBackendError(error: unknown, res: Response): void {
  if (error instanceof PythonBackendError) {
    switch (error.code) {
      case "INVALID_API_KEY":
        res.status(401).json({
          error: "Unauthorized",
          message: "Invalid API key",
        });
        return;
      
      case "RATE_LIMITED":
        res.status(429).json({
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: 60,
        });
        return;
      
      case "QUOTA_EXCEEDED":
        res.status(402).json({
          error: "Quota exceeded",
          message: "Your usage quota has been exceeded. Please upgrade your plan.",
        });
        return;
      
      case "TIMEOUT":
        res.status(504).json({
          error: "Request timeout",
          message: "The request took too long to process. Please try again.",
        });
        return;
      
      case "SERVICE_UNAVAILABLE":
        res.status(503).json({
          error: "Service unavailable",
          message: "Chat service is temporarily unavailable. Please try again later.",
        });
        return;
      
      default:
        res.status(500).json({
          error: "Processing error",
          message: "An error occurred while processing your request.",
          traceId: error.traceId,
        });
        return;
    }
  }

  // Unknown error
  console.error("Unexpected error in widget route:", error);
  res.status(500).json({
    error: "Internal server error",
    message: "An unexpected error occurred",
  });
}

// ============================================================================
// CORS MIDDLEWARE FOR WIDGET ROUTES
// ============================================================================

/**
 * Handle CORS for widget routes
 * Uses allowedDomains from authenticated client
 */
router.use((req, res, next) => {
  const authReq = req as AuthenticatedWidgetRequest;
  const origin = req.headers.origin;

  // Set CORS headers if origin is present and client is authenticated
  if (origin && authReq.client) {
    const allowedDomains = authReq.client.allowedDomains as string[];
    
    // If no domains specified, allow all origins (not recommended for production)
    if (!allowedDomains || allowedDomains.length === 0) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      // Check if origin matches allowed domains
      const isAllowed = allowedDomains.some(domain => {
        // Handle wildcard domains (e.g., "*.example.com")
        if (domain.startsWith("*.")) {
          const baseDomain = domain.slice(2);
          return origin.endsWith(baseDomain);
        }
        return origin === domain || origin === `https://${domain}` || origin === `http://${domain}`;
      });

      if (isAllowed) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
    }

    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// ============================================================================
// WIDGET API ENDPOINTS
// ============================================================================

/**
 * POST /api/widget/chat
 * 
 * Process chat messages via Python backend (non-streaming)
 * 
 * Authentication: Required via x-api-key header
 * 
 * Request Body:
 * {
 *   message: string (1-2000 chars),
 *   sessionId: string (UUID),
 *   metadata?: {
 *     userAgent?: string,
 *     pageUrl?: string,
 *     customFields?: Record<string, any>
 *   }
 * }
 * 
 * Response:
 * {
 *   response: string,
 *   sessionId: string,
 *   sources?: Array<{ documentId, title, excerpt, score }>
 * }
 */
router.post(
  "/chat",
  authenticateWidget,
  async (req, res) => {
    const authReq = req as AuthenticatedWidgetRequest;
    
    try {
      // Validate request body
      const parseResult = chatRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({
          error: "Invalid request",
          message: validationError.message,
          details: parseResult.error.errors,
        });
      }

      const { message, sessionId, metadata } = parseResult.data;

      // Prepare payload for Python backend
      const pythonRequest: PythonChatRequest = {
        clientId: authReq.clientId,
        message,
        sessionId,
        metadata,
      };

      // Call Python backend
      const pythonResponse = await pythonBackend.sendChatMessage(pythonRequest);

      // Build response
      const chatResponse: ChatResponse = {
        response: pythonResponse.response,
        sessionId: pythonResponse.sessionId,
        sources: pythonResponse.sources,
      };

      return res.status(200).json(chatResponse);
    } catch (error) {
      handlePythonBackendError(error, res);
    }
  }
);

/**
 * POST /api/widget/chat/stream
 * 
 * Process chat messages via Python backend with SSE streaming
 * 
 * Authentication: Required via x-api-key header
 * 
 * Request Body: Same as /chat
 * 
 * Response: Server-Sent Events stream
 * - event: start - Stream started
 * - event: chunk - Text chunk (data: "partial text")
 * - event: sources - Source references (data: JSON array)
 * - event: usage - Token usage stats (data: JSON object)
 * - event: done - Stream completed
 * - event: error - Error occurred (data: JSON error object)
 */
router.post(
  "/chat/stream",
  authenticateWidget,
  async (req, res) => {
    const authReq = req as AuthenticatedWidgetRequest;
    
    try {
      // Validate request body
      const parseResult = chatRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({
          error: "Invalid request",
          message: validationError.message,
          details: parseResult.error.errors,
        });
      }

      const { message, sessionId, metadata } = parseResult.data;

      // Set up SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

      // Prepare payload for Python backend
      const pythonRequest: PythonChatRequest = {
        clientId: authReq.clientId,
        message,
        sessionId,
        metadata,
      };

      // Stream response from Python backend
      try {
        for await (const chunk of pythonBackend.streamChatResponse(pythonRequest)) {
          res.write(chunk);
        }
      } catch (streamError) {
        // Send error event
        const errorPayload = {
          code: streamError instanceof PythonBackendError ? streamError.code : "STREAM_ERROR",
          message: streamError instanceof Error ? streamError.message : "Stream error",
        };
        res.write(`event: error\ndata: ${JSON.stringify(errorPayload)}\n\n`);
      }

      res.end();
    } catch (error) {
      // If headers not sent, return regular error response
      if (!res.headersSent) {
        handlePythonBackendError(error, res);
      } else {
        // Headers already sent, try to send error event
        const errorPayload = {
          code: "PROCESSING_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        };
        res.write(`event: error\ndata: ${JSON.stringify(errorPayload)}\n\n`);
        res.end();
      }
    }
  }
);

/**
 * GET /api/widget/config
 * 
 * Fetch widget configuration for the authenticated client
 * 
 * Authentication: Required via x-api-key header
 * 
 * Response:
 * {
 *   widget: {
 *     primaryColor: string,
 *     position: string,
 *     welcomeMessage: string,
 *     widgetName: string
 *   }
 * }
 */
router.get(
  "/config",
  authenticateWidget,
  async (req, res) => {
    const authReq = req as AuthenticatedWidgetRequest;
    
    try {
      // Get widget configuration for this client
      const widgetConfig = await storage.getClientWidget(authReq.clientId);

      // If no configuration exists, return defaults
      if (!widgetConfig) {
        return res.status(200).json(getDefaultWidgetConfig());
      }

      // Build response - exclude internal fields like IDs and timestamps
      const response: WidgetConfigResponse = {
        widget: {
          primaryColor: widgetConfig.primaryColor,
          position: widgetConfig.position,
          welcomeMessage: widgetConfig.welcomeMessage,
          widgetName: widgetConfig.widgetName,
        },
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error("Config endpoint error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred",
      });
    }
  }
);

/**
 * GET /api/widget/health
 * 
 * Health check endpoint (no authentication required)
 * Also checks Python backend health
 * 
 * Response:
 * {
 *   status: "ok" | "degraded",
 *   timestamp: string,
 *   services: {
 *     express: boolean,
 *     pythonBackend: boolean
 *   }
 * }
 */
router.get("/health", async (req, res) => {
  const pythonAvailable = await pythonBackend.isAvailable();
  
  const status = pythonAvailable ? "ok" : "degraded";
  
  res.status(200).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      express: true,
      pythonBackend: pythonAvailable,
    },
  });
});

export default router;
