import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { authenticateWidget, type AuthenticatedWidgetRequest } from "../middleware/widget-auth";
import { storage } from "../storage";

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
 * Schema for chat response sources
 */
interface ChatSource {
  title: string;
  url?: string;
  excerpt: string;
}

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
 * Call n8n webhook with chat payload
 * @param payload The payload to send to n8n
 * @returns The response from n8n
 */
async function callN8nWebhook(payload: {
  clientId: string;
  message: string;
  sessionId: string;
  metadata?: ChatRequest["metadata"];
  timestamp: string;
}): Promise<{ response: string; sources?: ChatSource[] }> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("N8N_WEBHOOK_URL not configured");
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.N8N_WEBHOOK_SECRET && {
          "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET,
        }),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`n8n webhook returned ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("n8n webhook error:", error);
    
    // Check if it's a timeout
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Request timed out");
    }
    
    throw new Error("Failed to process chat request");
  }
}

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
 * Process chat messages and return AI responses
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
 *   sources?: Array<{ title, url?, excerpt }>
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

      // Prepare payload for n8n webhook
      const webhookPayload = {
        clientId: authReq.clientId,
        message,
        sessionId,
        metadata,
        timestamp: new Date().toISOString(),
      };

      // Call n8n webhook
      let n8nResponse: { response: string; sources?: ChatSource[] };
      
      try {
        n8nResponse = await callN8nWebhook(webhookPayload);
      } catch (error) {
        console.error("Failed to get response from n8n:", error);
        
        // Return appropriate error based on the failure
        if (error instanceof Error) {
          if (error.message.includes("not configured")) {
            return res.status(503).json({
              error: "Service unavailable",
              message: "Chat service is not configured",
            });
          }
          
          if (error.message.includes("timed out")) {
            return res.status(504).json({
              error: "Request timeout",
              message: "The request took too long to process. Please try again.",
            });
          }
        }
        
        return res.status(503).json({
          error: "Service unavailable",
          message: "Unable to process chat request at this time",
        });
      }

      // Build response
      const chatResponse: ChatResponse = {
        response: n8nResponse.response,
        sessionId,
        sources: n8nResponse.sources,
      };

      return res.status(200).json(chatResponse);
    } catch (error) {
      console.error("Chat endpoint error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred",
      });
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
 * 
 * Response:
 * {
 *   status: "ok",
 *   timestamp: string
 * }
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default router;
