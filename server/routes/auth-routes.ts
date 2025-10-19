import { Router } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { storage } from "../storage";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const registerSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be less than 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
  clientName: z.string()
    .min(1, "Client name is required")
    .max(100, "Client name must be less than 100 characters")
    .optional(),
});

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique public API key with pk_live_ prefix
 */
function generatePublicApiKey(): string {
  return `pk_live_${randomBytes(32).toString('hex')}`;
}

/**
 * Create a default client for a new user
 */
async function createDefaultClient(userId: string, clientName: string) {
  const publicApiKey = generatePublicApiKey();
  
  const client = await storage.createClient({
    userId,
    name: clientName,
    publicApiKey,
    allowedDomains: [],
    status: "active",
  });

  // Create default widget configuration
  await storage.createClientWidget({
    clientId: client.id,
    primaryColor: "#3b82f6",
    position: "bottom-right",
    welcomeMessage: "Hi! How can I help?",
    widgetName: "Support",
  });

  return client;
}

// ============================================================================
// AUTH ROUTES
// ============================================================================

/**
 * POST /api/auth/register
 * 
 * Register a new user and automatically create their first client
 * 
 * Request Body:
 * {
 *   username: string,
 *   password: string,
 *   clientName?: string (defaults to "{username}'s Dashboard")
 * }
 * 
 * Response:
 * {
 *   user: { id, username },
 *   client: { id, name, publicApiKey }
 * }
 */
router.post("/register", async (req, res) => {
  try {
    // Validate request body
    const parseResult = registerSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      const validationError = fromError(parseResult.error);
      return res.status(400).json({
        error: "Validation error",
        message: validationError.message,
        details: parseResult.error.errors,
      });
    }

    const { username, password, clientName } = parseResult.data;

    // Check if username already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        error: "Conflict",
        message: "Username already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await storage.createUser({
      username,
      password: hashedPassword,
    });

    // Create default client
    const defaultClientName = clientName || `${username}'s Dashboard`;
    const client = await createDefaultClient(user.id, defaultClientName);

    // Create session
    req.session.userId = user.id;

    // Return user and client info (excluding sensitive data)
    return res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
      },
      client: {
        id: client.id,
        name: client.name,
        publicApiKey: client.publicApiKey,
        allowedDomains: client.allowedDomains,
        status: client.status,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "An error occurred during registration",
    });
  }
});

/**
 * POST /api/auth/login
 * 
 * Login with username and password
 * 
 * Request Body:
 * {
 *   username: string,
 *   password: string
 * }
 * 
 * Response:
 * {
 *   user: { id, username },
 *   client: { id, name, publicApiKey } | null
 * }
 */
router.post("/login", async (req, res) => {
  try {
    // Validate request body
    const parseResult = loginSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      const validationError = fromError(parseResult.error);
      return res.status(400).json({
        error: "Validation error",
        message: validationError.message,
        details: parseResult.error.errors,
      });
    }

    const { username, password } = parseResult.data;

    // Get user
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid username or password",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid username or password",
      });
    }

    // Get or create client for backward compatibility
    let clients = await storage.getClientsByUserId(user.id);
    
    if (clients.length === 0) {
      // Auto-migrate existing users without clients
      const client = await createDefaultClient(user.id, `${username}'s Dashboard`);
      clients = [client];
    }

    // Create session
    req.session.userId = user.id;

    // Return user and primary client info
    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
      },
      client: clients.length > 0 ? {
        id: clients[0].id,
        name: clients[0].name,
        publicApiKey: clients[0].publicApiKey,
        allowedDomains: clients[0].allowedDomains,
        status: clients[0].status,
      } : null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "An error occurred during login",
    });
  }
});

/**
 * POST /api/auth/logout
 * 
 * Logout and destroy session
 * 
 * Response:
 * {
 *   message: "Logged out successfully"
 * }
 */
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({
        error: "Internal server error",
        message: "An error occurred during logout",
      });
    }

    res.clearCookie("connect.sid");
    return res.status(200).json({
      message: "Logged out successfully",
    });
  });
});

/**
 * GET /api/auth/me
 * 
 * Get current authenticated user and their primary client
 * 
 * Authentication: Required
 * 
 * Response:
 * {
 *   user: { id, username },
 *   client: { id, name, publicApiKey, allowedDomains, status } | null
 * }
 */
router.get("/me", requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    return res.status(200).json({
      user: {
        id: authReq.user!.id,
        username: authReq.user!.username,
      },
      client: authReq.client ? {
        id: authReq.client.id,
        name: authReq.client.name,
        publicApiKey: authReq.client.publicApiKey,
        allowedDomains: authReq.client.allowedDomains,
        status: authReq.client.status,
      } : null,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "An error occurred while fetching user data",
    });
  }
});

export default router;
