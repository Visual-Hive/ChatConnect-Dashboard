import { Router } from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const router = Router();

/**
 * Get the absolute path to the public directory
 */
function getPublicPath(): string {
  // In production, public dir is at the root
  return path.join(process.cwd(), "public");
}

/**
 * Serve widget.js with CDN-friendly headers
 * 
 * GET /widget/v1/widget.js
 * 
 * Returns the widget JavaScript file with appropriate headers for:
 * - CDN caching
 * - CORS support
 * - Security
 */
router.get("/v1/widget.js", async (req, res) => {
  try {
    const widgetPath = path.join(getPublicPath(), "widget/v1/widget.js");
    
    // Check if file exists
    try {
      await fs.access(widgetPath);
    } catch {
      return res.status(404).json({
        error: "Widget not found",
        message: "The widget file could not be found",
      });
    }

    // Read file
    const content = await fs.readFile(widgetPath, "utf-8");

    // Set headers for CDN and security
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400"); // 1h browser, 24h CDN
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow from any domain
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    
    // Add ETag for efficient caching
    const etag = Buffer.from(content).toString("base64").slice(0, 27);
    res.setHeader("ETag", `"${etag}"`);
    
    // Check if client has cached version
    if (req.headers["if-none-match"] === `"${etag}"`) {
      return res.status(304).end();
    }

    res.send(content);
  } catch (error) {
    console.error("Error serving widget.js:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to serve widget file",
    });
  }
});

/**
 * Serve widget.css with CDN-friendly headers
 * 
 * GET /widget/v1/widget.css
 * 
 * Returns the widget CSS file with appropriate headers for:
 * - CDN caching
 * - CORS support
 * - Security
 */
router.get("/v1/widget.css", async (req, res) => {
  try {
    const cssPath = path.join(getPublicPath(), "widget/v1/widget.css");
    
    // Check if file exists
    try {
      await fs.access(cssPath);
    } catch {
      return res.status(404).json({
        error: "Stylesheet not found",
        message: "The widget stylesheet could not be found",
      });
    }

    // Read file
    const content = await fs.readFile(cssPath, "utf-8");

    // Set headers for CDN and security
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400"); // 1h browser, 24h CDN
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow from any domain
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("X-Content-Type-Options", "nosniff");
    
    // Add ETag for efficient caching
    const etag = Buffer.from(content).toString("base64").slice(0, 27);
    res.setHeader("ETag", `"${etag}"`);
    
    // Check if client has cached version
    if (req.headers["if-none-match"] === `"${etag}"`) {
      return res.status(304).end();
    }

    res.send(content);
  } catch (error) {
    console.error("Error serving widget.css:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to serve widget stylesheet",
    });
  }
});

/**
 * Handle OPTIONS requests for CORS preflight
 */
router.options("/v1/*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

/**
 * Widget version info endpoint
 * 
 * GET /widget/version
 * 
 * Returns version information about the widget
 */
router.get("/version", (req, res) => {
  res.json({
    version: "1.0.0",
    availableVersions: ["v1"],
    currentVersion: "v1",
    cdnUrl: `${req.protocol}://${req.get("host")}/widget/v1/widget.js`,
  });
});

export default router;
