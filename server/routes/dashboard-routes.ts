import { Router } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { storage } from "../storage";
import { requireAuth, verifyClientOwnership, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Apply authentication to all dashboard routes
router.use(requireAuth);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const updateClientSchema = z.object({
  name: z.string()
    .min(1, "Client name is required")
    .max(100, "Client name must be less than 100 characters")
    .optional(),
  status: z.enum(["active", "paused", "disabled"]).optional(),
});

const updateDomainsSchema = z.object({
  domains: z.array(z.string()).default([]),
});

const updateWidgetSchema = z.object({
  primaryColor: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format")
    .optional(),
  position: z.enum(["bottom-left", "bottom-right"]).optional(),
  welcomeMessage: z.string()
    .max(500, "Welcome message must be less than 500 characters")
    .optional(),
  widgetName: z.string()
    .max(100, "Widget name must be less than 100 characters")
    .optional(),
});

// ============================================================================
// CLIENT MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/dashboard/clients
 * 
 * Get all clients for the authenticated user
 * 
 * Authentication: Required
 * 
 * Response:
 * {
 *   clients: Array<{
 *     id, name, publicApiKey, allowedDomains, status, createdAt
 *   }>
 * }
 */
router.get("/clients", async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const clients = await storage.getClientsByUserId(authReq.userId!);

    return res.status(200).json({
      clients: clients.map(client => ({
        id: client.id,
        name: client.name,
        publicApiKey: client.publicApiKey,
        allowedDomains: client.allowedDomains,
        status: client.status,
        createdAt: client.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get clients error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch clients",
    });
  }
});

/**
 * GET /api/dashboard/clients/:clientId
 * 
 * Get a specific client by ID
 * 
 * Authentication: Required
 * Authorization: Must own the client
 * 
 * Response:
 * {
 *   id, name, publicApiKey, allowedDomains, status, createdAt
 * }
 */
router.get("/clients/:clientId", verifyClientOwnership, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    return res.status(200).json({
      id: authReq.client!.id,
      name: authReq.client!.name,
      publicApiKey: authReq.client!.publicApiKey,
      allowedDomains: authReq.client!.allowedDomains,
      status: authReq.client!.status,
      createdAt: authReq.client!.createdAt,
    });
  } catch (error) {
    console.error("Get client error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch client",
    });
  }
});

/**
 * PATCH /api/dashboard/clients/:clientId
 * 
 * Update client information
 * 
 * Authentication: Required
 * Authorization: Must own the client
 * 
 * Request Body:
 * {
 *   name?: string,
 *   status?: "active" | "paused" | "disabled"
 * }
 * 
 * Response:
 * {
 *   id, name, publicApiKey, allowedDomains, status, createdAt
 * }
 */
router.patch("/clients/:clientId", verifyClientOwnership, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    // Validate request body
    const parseResult = updateClientSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      const validationError = fromError(parseResult.error);
      return res.status(400).json({
        error: "Validation error",
        message: validationError.message,
        details: parseResult.error.errors,
      });
    }

    const updates = parseResult.data;

    // Update client
    const updatedClient = await storage.updateClient(authReq.clientId!, updates);

    return res.status(200).json({
      id: updatedClient.id,
      name: updatedClient.name,
      publicApiKey: updatedClient.publicApiKey,
      allowedDomains: updatedClient.allowedDomains,
      status: updatedClient.status,
      createdAt: updatedClient.createdAt,
    });
  } catch (error) {
    console.error("Update client error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to update client",
    });
  }
});

/**
 * POST /api/dashboard/clients/:clientId/regenerate-key
 * 
 * Regenerate the public API key for a client
 * 
 * Authentication: Required
 * Authorization: Must own the client
 * 
 * Response:
 * {
 *   id, name, publicApiKey, allowedDomains, status, createdAt
 * }
 */
router.post("/clients/:clientId/regenerate-key", verifyClientOwnership, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    // Regenerate API key
    const updatedClient = await storage.regenerateClientApiKey(authReq.clientId!);

    return res.status(200).json({
      id: updatedClient.id,
      name: updatedClient.name,
      publicApiKey: updatedClient.publicApiKey,
      allowedDomains: updatedClient.allowedDomains,
      status: updatedClient.status,
      createdAt: updatedClient.createdAt,
    });
  } catch (error) {
    console.error("Regenerate API key error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to regenerate API key",
    });
  }
});

/**
 * PATCH /api/dashboard/clients/:clientId/domains
 * 
 * Update allowed domains for CORS
 * 
 * Authentication: Required
 * Authorization: Must own the client
 * 
 * Request Body:
 * {
 *   domains: string[] (e.g., ["example.com", "*.example.com"])
 * }
 * 
 * Response:
 * {
 *   id, name, publicApiKey, allowedDomains, status, createdAt
 * }
 */
router.patch("/clients/:clientId/domains", verifyClientOwnership, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    // Validate request body
    const parseResult = updateDomainsSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      const validationError = fromError(parseResult.error);
      return res.status(400).json({
        error: "Validation error",
        message: validationError.message,
        details: parseResult.error.errors,
      });
    }

    const { domains } = parseResult.data;

    // Update domains
    const updatedClient = await storage.updateClientDomains(authReq.clientId!, domains);

    return res.status(200).json({
      id: updatedClient.id,
      name: updatedClient.name,
      publicApiKey: updatedClient.publicApiKey,
      allowedDomains: updatedClient.allowedDomains,
      status: updatedClient.status,
      createdAt: updatedClient.createdAt,
    });
  } catch (error) {
    console.error("Update domains error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to update allowed domains",
    });
  }
});

// ============================================================================
// WIDGET CONFIGURATION ROUTES
// ============================================================================

/**
 * GET /api/dashboard/widget/:clientId
 * 
 * Get widget configuration for a client
 * 
 * Authentication: Required
 * Authorization: Must own the client
 * 
 * Response:
 * {
 *   id, clientId, primaryColor, position, welcomeMessage, widgetName
 * }
 */
router.get("/widget/:clientId", verifyClientOwnership, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    // Get or create widget configuration
    const widget = await storage.getOrCreateClientWidget(authReq.clientId!);

    return res.status(200).json({
      id: widget.id,
      clientId: widget.clientId,
      primaryColor: widget.primaryColor,
      position: widget.position,
      welcomeMessage: widget.welcomeMessage,
      widgetName: widget.widgetName,
    });
  } catch (error) {
    console.error("Get widget config error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch widget configuration",
    });
  }
});

/**
 * PUT /api/dashboard/widget/:clientId
 * 
 * Update widget configuration for a client
 * 
 * Authentication: Required
 * Authorization: Must own the client
 * 
 * Request Body:
 * {
 *   primaryColor?: string,
 *   position?: "bottom-left" | "bottom-right",
 *   welcomeMessage?: string,
 *   widgetName?: string
 * }
 * 
 * Response:
 * {
 *   id, clientId, primaryColor, position, welcomeMessage, widgetName
 * }
 */
router.put("/widget/:clientId", verifyClientOwnership, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    // Validate request body
    const parseResult = updateWidgetSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      const validationError = fromError(parseResult.error);
      return res.status(400).json({
        error: "Validation error",
        message: validationError.message,
        details: parseResult.error.errors,
      });
    }

    const updates = parseResult.data;

    // Ensure widget exists, create if not
    await storage.getOrCreateClientWidget(authReq.clientId!);

    // Update widget configuration
    const updatedWidget = await storage.updateClientWidget(authReq.clientId!, updates);

    return res.status(200).json({
      id: updatedWidget.id,
      clientId: updatedWidget.clientId,
      primaryColor: updatedWidget.primaryColor,
      position: updatedWidget.position,
      welcomeMessage: updatedWidget.welcomeMessage,
      widgetName: updatedWidget.widgetName,
    });
  } catch (error) {
    console.error("Update widget config error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to update widget configuration",
    });
  }
});

export default router;
