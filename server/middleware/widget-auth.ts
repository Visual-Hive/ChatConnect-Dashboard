import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import type { Client } from "@shared/schema";

/**
 * Extended Request interface with authenticated client information
 */
export interface AuthenticatedWidgetRequest extends Request {
  clientId: string;
  client: Client;
}

/**
 * Middleware to authenticate widget API requests via public API key
 * 
 * Security features:
 * - Validates API key format (pk_live_*)
 * - Verifies key exists in database
 * - Checks client status (active/paused/disabled)
 * - Optional domain validation for CORS
 * - Attaches client context to request
 * 
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export async function authenticateWidget(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extract API key from x-api-key header
    const apiKey = req.headers["x-api-key"] as string | undefined;

    // 2. Validate API key presence and format
    if (!apiKey) {
      res.status(401).json({ 
        error: "Missing API key",
        message: "Please provide an API key in the x-api-key header" 
      });
      return;
    }

    if (!apiKey.startsWith("pk_live_")) {
      res.status(401).json({ 
        error: "Invalid API key format",
        message: "API key must start with pk_live_" 
      });
      return;
    }

    // 3. Lookup client by publicApiKey
    const client = await storage.getClientByPublicKey(apiKey);

    // 4. Verify client exists
    if (!client) {
      res.status(401).json({ 
        error: "Invalid API key",
        message: "The provided API key is not valid" 
      });
      return;
    }

    // 5. Check client status
    if (client.status !== "active") {
      res.status(403).json({ 
        error: "Client account not active",
        message: `Your account status is: ${client.status}`,
        status: client.status 
      });
      return;
    }

    // 6. Optional: Domain validation for CORS
    const allowedDomains = client.allowedDomains as string[];
    if (allowedDomains && allowedDomains.length > 0) {
      const origin = req.headers.origin || req.headers.referer;
      
      if (origin) {
        // Extract domain from origin/referer URL
        let originDomain: string;
        try {
          const url = new URL(origin);
          originDomain = url.origin;
        } catch {
          // If parsing fails, use the origin as-is
          originDomain = origin;
        }

        // Check if origin matches any allowed domains
        const isAllowed = allowedDomains.some(domain => {
          // Support exact match or wildcard subdomain matching
          if (domain.startsWith("*.")) {
            const baseDomain = domain.slice(2);
            return originDomain.endsWith(baseDomain);
          }
          return originDomain === domain || originDomain === `https://${domain}` || originDomain === `http://${domain}`;
        });

        if (!isAllowed) {
          res.status(403).json({ 
            error: "Domain not allowed",
            message: "Your domain is not authorized to use this API key" 
          });
          return;
        }
      }
    }

    // 7. Attach client information to request for downstream use
    const authenticatedReq = req as AuthenticatedWidgetRequest;
    authenticatedReq.clientId = client.id;
    authenticatedReq.client = client;

    // Proceed to next middleware/route handler
    next();
  } catch (error) {
    // Catch-all error handler - don't leak internal details
    console.error("Widget authentication error:", error);
    res.status(500).json({ 
      error: "Authentication error",
      message: "An error occurred during authentication" 
    });
  }
}
