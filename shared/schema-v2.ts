/**
 * Extended Database Schema for ChatConnect Dashboard V2
 * 
 * Adds tables for:
 * - documents (knowledge base files)
 * - chat_logs (conversation history)
 * - usage_stats (token tracking, costs)
 */

import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  jsonb, 
  integer,
  boolean,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// EXISTING TABLES (from original schema.ts)
// ============================================================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  publicApiKey: varchar("public_api_key").notNull().unique(),
  allowedDomains: jsonb("allowed_domains").notNull().default(sql`'[]'::jsonb`),
  status: varchar("status").notNull().default("active"),
  tier: varchar("tier").notNull().default("free"), // "free" | "paid"
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("clients_user_id_idx").on(table.userId),
  publicApiKeyIdx: index("clients_public_api_key_idx").on(table.publicApiKey),
}));

export const clientWidgets = pgTable("client_widgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id).unique(),
  primaryColor: varchar("primary_color").notNull().default("#3b82f6"),
  position: varchar("position").notNull().default("bottom-right"),
  welcomeMessage: text("welcome_message").notNull().default("Hi! How can I help?"),
  widgetName: varchar("widget_name").notNull().default("Support"),
  // LLM Configuration
  model: varchar("model").default("gpt-4o-mini"), // "gpt-4o-mini" | "claude-sonnet-4-5-20250514"
  systemPrompt: text("system_prompt"),
  maxTokens: integer("max_tokens").default(1000),
  temperature: decimal("temperature", { precision: 2, scale: 1 }).default("0.7"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  clientIdIdx: index("client_widgets_client_id_idx").on(table.clientId),
}));

// ============================================================================
// NEW: DOCUMENTS TABLE (Knowledge Base)
// ============================================================================

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  
  // File metadata
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  fileType: varchar("file_type").notNull(), // "pdf" | "docx" | "txt" | "csv"
  fileSize: integer("file_size").notNull(), // bytes
  filePath: varchar("file_path"), // Storage path
  
  // Processing status
  status: varchar("status").notNull().default("pending"), 
  // "pending" | "parsing" | "chunking" | "embedding" | "completed" | "failed"
  progress: integer("progress").notNull().default(0), // 0-100
  currentStep: varchar("current_step"),
  errorMessage: text("error_message"),
  
  // Processing results
  chunksTotal: integer("chunks_total"),
  chunksProcessed: integer("chunks_processed"),
  qdrantPointIds: jsonb("qdrant_point_ids").default(sql`'[]'::jsonb`), // Array of point IDs
  
  // Metadata
  title: text("title"), // Extracted or user-provided title
  description: text("description"),
  tags: jsonb("tags").default(sql`'[]'::jsonb`), // Array of tag strings
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`), // Additional metadata
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
}, (table) => ({
  clientIdIdx: index("documents_client_id_idx").on(table.clientId),
  statusIdx: index("documents_status_idx").on(table.status),
  clientStatusIdx: index("documents_client_status_idx").on(table.clientId, table.status),
}));

// ============================================================================
// NEW: CHAT LOGS TABLE
// ============================================================================

export const chatLogs = pgTable("chat_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  sessionId: varchar("session_id").notNull(),
  
  // Message content
  role: varchar("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  
  // For assistant messages
  sources: jsonb("sources"), // Array of { documentId, title, excerpt, score }
  
  // Token tracking
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  totalTokens: integer("total_tokens"),
  cached: boolean("cached").default(false),
  
  // Metadata
  model: varchar("model"), // Which model was used
  latencyMs: integer("latency_ms"), // Response time
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  
  // Trace ID for debugging
  traceId: varchar("trace_id"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  clientIdIdx: index("chat_logs_client_id_idx").on(table.clientId),
  sessionIdIdx: index("chat_logs_session_id_idx").on(table.sessionId),
  clientSessionIdx: index("chat_logs_client_session_idx").on(table.clientId, table.sessionId),
  createdAtIdx: index("chat_logs_created_at_idx").on(table.createdAt),
}));

// ============================================================================
// NEW: USAGE STATS TABLE (Aggregated daily stats)
// ============================================================================

export const usageStats = pgTable("usage_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  date: timestamp("date").notNull(), // Day (truncated to date)
  
  // Message counts
  totalMessages: integer("total_messages").notNull().default(0),
  userMessages: integer("user_messages").notNull().default(0),
  assistantMessages: integer("assistant_messages").notNull().default(0),
  
  // Token counts
  totalTokens: integer("total_tokens").notNull().default(0),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  cachedTokens: integer("cached_tokens").notNull().default(0),
  
  // Cost tracking (in cents)
  estimatedCostCents: integer("estimated_cost_cents").notNull().default(0),
  
  // Session stats
  uniqueSessions: integer("unique_sessions").notNull().default(0),
  
  // Performance
  avgLatencyMs: integer("avg_latency_ms"),
  p95LatencyMs: integer("p95_latency_ms"),
  
  // Timestamps
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  clientIdIdx: index("usage_stats_client_id_idx").on(table.clientId),
  dateIdx: index("usage_stats_date_idx").on(table.date),
  clientDateIdx: index("usage_stats_client_date_idx").on(table.clientId, table.date),
}));

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

// Users
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Clients
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

// Client Widgets
export const insertClientWidgetSchema = createInsertSchema(clientWidgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateClientWidgetSchema = insertClientWidgetSchema.partial();

// Documents
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
});

export const updateDocumentSchema = createInsertSchema(documents).pick({
  status: true,
  progress: true,
  currentStep: true,
  errorMessage: true,
  chunksTotal: true,
  chunksProcessed: true,
  qdrantPointIds: true,
  processedAt: true,
}).partial();

// Chat Logs
export const insertChatLogSchema = createInsertSchema(chatLogs).omit({
  id: true,
  createdAt: true,
});

// Usage Stats
export const insertUsageStatSchema = createInsertSchema(usageStats).omit({
  id: true,
  updatedAt: true,
});

export const updateUsageStatSchema = createInsertSchema(usageStats).pick({
  totalMessages: true,
  userMessages: true,
  assistantMessages: true,
  totalTokens: true,
  promptTokens: true,
  completionTokens: true,
  cachedTokens: true,
  estimatedCostCents: true,
  uniqueSessions: true,
  avgLatencyMs: true,
  p95LatencyMs: true,
}).partial();

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertClientWidget = z.infer<typeof insertClientWidgetSchema>;
export type UpdateClientWidget = z.infer<typeof updateClientWidgetSchema>;
export type ClientWidget = typeof clientWidgets.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertChatLog = z.infer<typeof insertChatLogSchema>;
export type ChatLog = typeof chatLogs.$inferSelect;

export type InsertUsageStat = z.infer<typeof insertUsageStatSchema>;
export type UpdateUsageStat = z.infer<typeof updateUsageStatSchema>;
export type UsageStat = typeof usageStats.$inferSelect;

// ============================================================================
// ENUMS (for reference)
// ============================================================================

export const ClientTier = {
  FREE: "free",
  PAID: "paid",
} as const;

export const ClientStatus = {
  ACTIVE: "active",
  PAUSED: "paused",
  DISABLED: "disabled",
} as const;

export const DocumentStatus = {
  PENDING: "pending",
  PARSING: "parsing",
  CHUNKING: "chunking",
  EMBEDDING: "embedding",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const FileType = {
  PDF: "pdf",
  DOCX: "docx",
  TXT: "txt",
  CSV: "csv",
} as const;

export const ChatRole = {
  USER: "user",
  ASSISTANT: "assistant",
} as const;

export const LLMModel = {
  GPT_4O_MINI: "gpt-4o-mini",
  CLAUDE_SONNET: "claude-sonnet-4-5-20250514",
} as const;
