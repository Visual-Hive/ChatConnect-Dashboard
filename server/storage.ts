import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

import { type User, type InsertUser, type Client, type InsertClient, type ClientWidget, type InsertClientWidget } from "@shared/schema";
import { users, clients, clientWidgets } from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

// Storage interface - defines all CRUD operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Client operations
  getClientByPublicKey(publicKey: string): Promise<Client | undefined>;
  getClient(clientId: string): Promise<Client | undefined>;
  getClientsByUserId(userId: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(clientId: string, updates: Partial<InsertClient>): Promise<Client>;
  regenerateClientApiKey(clientId: string): Promise<Client>;
  updateClientDomains(clientId: string, domains: string[]): Promise<Client>;
  
  // Widget operations
  getClientWidget(clientId: string): Promise<ClientWidget | undefined>;
  createClientWidget(widget: InsertClientWidget): Promise<ClientWidget>;
  updateClientWidget(clientId: string, updates: Partial<InsertClientWidget>): Promise<ClientWidget>;
  getOrCreateClientWidget(clientId: string): Promise<ClientWidget>;
}

/**
 * PostgreSQL-based storage implementation using Drizzle ORM
 * Provides persistent storage with ACID guarantees and multi-tenant isolation
 */
export class DatabaseStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL environment variable is not set. " +
        "Please configure your PostgreSQL connection string in .env file."
      );
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
  }

  // ============================================================================
  // User operations
  // ============================================================================

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db
      .insert(users)
      .values(insertUser)
      .returning();
    
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db
      .select()
      .from(users);
  }

  // ============================================================================
  // Client operations
  // ============================================================================

  async getClientByPublicKey(publicKey: string): Promise<Client | undefined> {
    const result = await this.db
      .select()
      .from(clients)
      .where(eq(clients.publicApiKey, publicKey))
      .limit(1);
    
    return result[0];
  }

  async getClient(clientId: string): Promise<Client | undefined> {
    const result = await this.db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    
    return result[0];
  }

  async getClientsByUserId(userId: string): Promise<Client[]> {
    return await this.db
      .select()
      .from(clients)
      .where(eq(clients.userId, userId));
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const result = await this.db
      .insert(clients)
      .values(insertClient)
      .returning();
    
    return result[0];
  }

  async updateClient(clientId: string, updates: Partial<InsertClient>): Promise<Client> {
    const result = await this.db
      .update(clients)
      .set(updates)
      .where(eq(clients.id, clientId))
      .returning();
    
    if (!result[0]) {
      throw new Error("Client not found");
    }
    
    return result[0];
  }

  async regenerateClientApiKey(clientId: string): Promise<Client> {
    const newApiKey = `pk_live_${randomBytes(32).toString('hex')}`;
    return this.updateClient(clientId, { publicApiKey: newApiKey });
  }

  async updateClientDomains(clientId: string, domains: string[]): Promise<Client> {
    return this.updateClient(clientId, { allowedDomains: domains });
  }

  // ============================================================================
  // Widget operations
  // ============================================================================

  async getClientWidget(clientId: string): Promise<ClientWidget | undefined> {
    const result = await this.db
      .select()
      .from(clientWidgets)
      .where(eq(clientWidgets.clientId, clientId))
      .limit(1);
    
    return result[0];
  }

  async createClientWidget(insertWidget: InsertClientWidget): Promise<ClientWidget> {
    const result = await this.db
      .insert(clientWidgets)
      .values(insertWidget)
      .returning();
    
    return result[0];
  }

  async updateClientWidget(clientId: string, updates: Partial<InsertClientWidget>): Promise<ClientWidget> {
    const result = await this.db
      .update(clientWidgets)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(clientWidgets.clientId, clientId))
      .returning();
    
    if (!result[0]) {
      throw new Error("Widget not found");
    }
    
    return result[0];
  }

  async getOrCreateClientWidget(clientId: string): Promise<ClientWidget> {
    const existing = await this.getClientWidget(clientId);
    if (existing) {
      return existing;
    }

    return this.createClientWidget({ clientId });
  }
}

// Export singleton instance
export const storage = new DatabaseStorage();
