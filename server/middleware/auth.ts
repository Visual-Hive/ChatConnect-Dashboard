import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import type { User, Client } from "@shared/schema";
import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

/**
 * Extended Request interface with authenticated user and client information
 */
export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
  client?: Client;
  clientId?: string;
}

/**
 * Middleware to authenticate dashboard requests via session
 * 
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  // Check if user is authenticated via session
  if (!req.session?.userId) {
    res.status(401).json({
      error: "Unauthorized",
      message: "You must be logged in to access this resource",
    });
    return;
  }

  try {
    // Get user from storage
    const user = await storage.getUser(req.session.userId);
    
    if (!user) {
      // Session exists but user doesn't - clear session
      req.session.destroy(() => {});
      res.status(401).json({
        error: "Unauthorized",
        message: "User session is invalid",
      });
      return;
    }

    // Attach user to request
    authReq.user = user;
    authReq.userId = user.id;

    // Get user's primary client (first one)
    const clients = await storage.getClientsByUserId(user.id);
    
    if (clients.length > 0) {
      authReq.client = clients[0];
      authReq.clientId = clients[0].id;
    }

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "An error occurred during authentication",
    });
  }
}

/**
 * Middleware to verify client ownership
 * Requires requireAuth to be called first
 */
export async function verifyClientOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.userId) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
    return;
  }

  const requestedClientId = req.params.clientId || req.body.clientId;

  if (!requestedClientId) {
    res.status(400).json({
      error: "Bad request",
      message: "Client ID is required",
    });
    return;
  }

  try {
    // Get the client
    const client = await storage.getClient(requestedClientId);

    if (!client) {
      res.status(404).json({
        error: "Not found",
        message: "Client not found",
      });
      return;
    }

    // Verify ownership
    if (client.userId !== authReq.userId) {
      res.status(403).json({
        error: "Forbidden",
        message: "You do not have access to this client",
      });
      return;
    }

    // Attach client to request
    authReq.client = client;
    authReq.clientId = client.id;

    next();
  } catch (error) {
    console.error("Client ownership verification error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "An error occurred during verification",
    });
  }
}
