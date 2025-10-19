import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import widgetRoutes from "./routes/widget-routes";
import widgetServeRoutes from "./routes/widget-serve";
import authRoutes from "./routes/auth-routes";
import dashboardRoutes from "./routes/dashboard-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Register authentication routes
  // Public routes for login, register, logout
  app.use("/api/auth", authRoutes);

  // Register dashboard API routes
  // Protected routes for client management and configuration
  app.use("/api/dashboard", dashboardRoutes);

  // Register widget API routes
  // Public-facing routes authenticated via API keys
  app.use("/api/widget", widgetRoutes);

  // Register widget file serving routes
  // Serves the embeddable widget.js and widget.css files
  app.use("/widget", widgetServeRoutes);

  const httpServer = createServer(app);

  return httpServer;
}
