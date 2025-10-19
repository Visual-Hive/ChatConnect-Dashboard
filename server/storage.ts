import { type User, type InsertUser, type Client, type InsertClient, type ClientWidget, type InsertClientWidget } from "@shared/schema";
import { randomUUID, randomBytes } from "crypto";

// modify the interface with any CRUD methods
// you might need

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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private clients: Map<string, Client>;
  private clientWidgets: Map<string, ClientWidget>;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.clientWidgets = new Map();
  }

  // ============================================================================
  // User operations
  // ============================================================================

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // ============================================================================
  // Client operations
  // ============================================================================

  async getClientByPublicKey(publicKey: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(
      (client) => client.publicApiKey === publicKey,
    );
  }

  async getClient(clientId: string): Promise<Client | undefined> {
    return this.clients.get(clientId);
  }

  async getClientsByUserId(userId: string): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId,
    );
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    const now = new Date();
    
    const client: Client = {
      id,
      userId: insertClient.userId,
      name: insertClient.name,
      publicApiKey: insertClient.publicApiKey,
      allowedDomains: insertClient.allowedDomains || [],
      status: insertClient.status || "active",
      createdAt: now,
    };
    
    this.clients.set(id, client);
    return client;
  }

  async updateClient(clientId: string, updates: Partial<InsertClient>): Promise<Client> {
    const existing = this.clients.get(clientId);
    if (!existing) {
      throw new Error("Client not found");
    }

    const updated: Client = {
      ...existing,
      ...updates,
    };

    this.clients.set(clientId, updated);
    return updated;
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
    return Array.from(this.clientWidgets.values()).find(
      (widget) => widget.clientId === clientId,
    );
  }

  async createClientWidget(insertWidget: InsertClientWidget): Promise<ClientWidget> {
    const id = randomUUID();
    const now = new Date();
    
    const widget: ClientWidget = {
      id,
      clientId: insertWidget.clientId,
      primaryColor: insertWidget.primaryColor || "#3b82f6",
      position: insertWidget.position || "bottom-right",
      welcomeMessage: insertWidget.welcomeMessage || "Hi! How can I help?",
      widgetName: insertWidget.widgetName || "Support",
      createdAt: now,
      updatedAt: now,
    };
    
    this.clientWidgets.set(id, widget);
    return widget;
  }

  async updateClientWidget(clientId: string, updates: Partial<InsertClientWidget>): Promise<ClientWidget> {
    const existing = await this.getClientWidget(clientId);
    if (!existing) {
      throw new Error("Widget not found");
    }

    const updated: ClientWidget = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.clientWidgets.set(existing.id, updated);
    return updated;
  }

  async getOrCreateClientWidget(clientId: string): Promise<ClientWidget> {
    const existing = await this.getClientWidget(clientId);
    if (existing) {
      return existing;
    }

    return this.createClientWidget({ clientId });
  }
}

export const storage = new MemStorage();
