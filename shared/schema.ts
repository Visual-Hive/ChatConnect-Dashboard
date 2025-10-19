import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// USERS TABLE (Existing - Authentication)
// ============================================================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============================================================================
// CLIENTS TABLE (Multi-Tenant Support)
// ============================================================================

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  publicApiKey: varchar("public_api_key").notNull().unique(),
  allowedDomains: jsonb("allowed_domains").notNull().default(sql`'[]'::jsonb`),
  status: varchar("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const selectClientSchema = createInsertSchema(clients);

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ============================================================================
// CLIENT WIDGETS TABLE (Widget Configuration per Client)
// ============================================================================

export const clientWidgets = pgTable("client_widgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id).unique(),
  primaryColor: varchar("primary_color").notNull().default("#3b82f6"),
  position: varchar("position").notNull().default("bottom-right"),
  welcomeMessage: text("welcome_message").notNull().default("Hi! How can I help?"),
  widgetName: varchar("widget_name").notNull().default("Support"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClientWidgetSchema = createInsertSchema(clientWidgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectClientWidgetSchema = createInsertSchema(clientWidgets);

export type InsertClientWidget = z.infer<typeof insertClientWidgetSchema>;
export type ClientWidget = typeof clientWidgets.$inferSelect;
