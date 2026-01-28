# Multi-Tenant SaaS Database Schema Implementation Plan

## Executive Summary

This document outlines the complete implementation plan for adding multi-tenant support to the ChatConnect Dashboard database schema. The design ensures complete data isolation between clients while maintaining full backward compatibility with the existing users table.

**Confidence Rating: 9/10**

Reasoning:
- ✅ Clear understanding of existing Drizzle ORM patterns
- ✅ Specifications are comprehensive and well-defined
- ✅ Multi-tenant architecture follows industry best practices
- ✅ Foreign key relationships are straightforward
- ⚠️ Minor uncertainty: Migration strategy for existing data (if any exists)

---

## 1. Current Schema Analysis

### Existing Structure

```typescript
// shared/schema.ts (current)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});
```

### Identified Patterns

| Pattern | Implementation | Consistency |
|---------|---------------|-------------|
| Primary Keys | `varchar("id").primaryKey().default(sql`gen_random_uuid()`)` | ✅ Consistent |
| NOT NULL | `.notNull()` chained | ✅ Consistent |
| Unique Constraints | `.unique()` chained | ✅ Consistent |
| Type Generation | `createInsertSchema` from drizzle-zod | ✅ Consistent |
| Type Exports | `InsertX` and `X` naming convention | ✅ Consistent |
| Imports | Organized: sql, table helpers, then validation | ✅ Consistent |

---

## 2. Multi-Tenant Architecture Design

### Data Model Overview

```
users (existing)
  └── clients (1:many relationship)
      └── clientWidgets (1:1 or 1:many relationship)
```

### Relationship Rules

1. **User → Client**: One user can own multiple clients (SaaS admin scenario)
2. **Client → Widget**: One client has one widget configuration (can be extended to many)
3. **Data Isolation**: All queries must filter by clientId in application layer
4. **API Key Security**: Each client has a unique public API key for widget embedding

### Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
│─────────────────│
│ id (PK)         │
│ username (UQ)   │
│ password        │
└────────┬────────┘
         │ 1
         │
         │ many
         ▼
┌─────────────────────────┐
│       clients           │
│─────────────────────────│
│ id (PK)                 │
│ userId (FK)             │◄─── References users.id
│ name                    │
│ publicApiKey (UQ)       │
│ allowedDomains (JSONB)  │
│ status                  │
│ createdAt               │
└────────┬────────────────┘
         │ 1
         │
         │ 1
         ▼
┌───────────────────────────┐
│    clientWidgets          │
│───────────────────────────│
│ id (PK)                   │
│ clientId (FK)             │◄─── References clients.id
│ primaryColor              │
│ position                  │
│ welcomeMessage            │
│ widgetName                │
│ createdAt                 │
│ updatedAt                 │
└───────────────────────────┘
```

---

## 3. Complete Schema Specifications

### Table: `clients`

**Purpose**: Represents a SaaS client/tenant. Each client is isolated and has their own widget configuration.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | varchar | PRIMARY KEY | gen_random_uuid() | Unique client identifier |
| userId | varchar | NOT NULL, FK → users.id | - | Owner of this client account |
| name | text | NOT NULL | - | Client/company name |
| publicApiKey | varchar | NOT NULL, UNIQUE | - | Public API key for widget embedding |
| allowedDomains | jsonb | NOT NULL | [] | Array of allowed domains for CORS |
| status | varchar | NOT NULL | 'active' | Client status: active, suspended, etc. |
| createdAt | timestamp | NOT NULL | now() | Account creation timestamp |

**Indexes**:
- Primary: `id`
- Foreign Key: `userId` → `users.id`
- Unique: `publicApiKey`
- Performance: Index on `userId` for user's clients lookup
- Performance: Index on `status` for filtering active clients

**Drizzle Implementation**:
```typescript
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  publicApiKey: varchar("public_api_key").notNull().unique(),
  allowedDomains: jsonb("allowed_domains").notNull().default(sql`'[]'::jsonb`),
  status: varchar("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

---

### Table: `clientWidgets`

**Purpose**: Widget configuration for each client. Stores appearance and behavior settings.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | varchar | PRIMARY KEY | gen_random_uuid() | Unique widget config identifier |
| clientId | varchar | NOT NULL, FK → clients.id | - | Associated client |
| primaryColor | varchar | NOT NULL | '#3b82f6' | Widget primary color (hex) |
| position | varchar | NOT NULL | 'bottom-right' | Widget position on page |
| welcomeMessage | text | NOT NULL | 'Hi! How can I help?' | Initial greeting message |
| widgetName | varchar | NOT NULL | 'Support' | Display name in widget header |
| createdAt | timestamp | NOT NULL | now() | Configuration creation time |
| updatedAt | timestamp | NOT NULL | now() | Last update timestamp |

**Indexes**:
- Primary: `id`
- Foreign Key: `clientId` → `clients.id`
- Unique: `clientId` (enforces 1:1 relationship)
- Performance: Index on `clientId` for fast widget lookup

**Drizzle Implementation**:
```typescript
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
```

---

## 4. Type Safety & Validation

### Zod Schemas

Following the existing pattern with `createInsertSchema`:

```typescript
// Clients
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const selectClientSchema = createInsertSchema(clients);

// Client Widgets
export const insertClientWidgetSchema = createInsertSchema(clientWidgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectClientWidgetSchema = createInsertSchema(clientWidgets);
```

### TypeScript Types

```typescript
// Clients
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Client Widgets
export type InsertClientWidget = z.infer<typeof insertClientWidgetSchema>;
export type ClientWidget = typeof clientWidgets.$inferSelect;
```

---

## 5. Data Isolation Strategy

### Application-Level Filtering

All queries MUST include client context:

```typescript
// ✅ CORRECT - Always filter by clientId
const widgets = await db
  .select()
  .from(clientWidgets)
  .where(eq(clientWidgets.clientId, authenticatedClientId));

// ❌ WRONG - Missing client filter (exposes all clients' data)
const widgets = await db.select().from(clientWidgets);
```

### Middleware Pattern

```typescript
// Recommended: Extract clientId from API key in middleware
app.use('/api/widget/*', async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const client = await db.select()
    .from(clients)
    .where(eq(clients.publicApiKey, apiKey))
    .limit(1);
  
  if (!client[0]) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  req.clientId = client[0].id;
  next();
});
```

---

## 6. Migration Strategy

### Step 1: Add New Tables

```sql
-- Drizzle will generate this migration
CREATE TABLE clients (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  public_api_key VARCHAR NOT NULL UNIQUE,
  allowed_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE client_widgets (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR NOT NULL REFERENCES clients(id) UNIQUE,
  primary_color VARCHAR NOT NULL DEFAULT '#3b82f6',
  position VARCHAR NOT NULL DEFAULT 'bottom-right',
  welcome_message TEXT NOT NULL DEFAULT 'Hi! How can I help?',
  widget_name VARCHAR NOT NULL DEFAULT 'Support',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### Step 2: Create Indexes

```sql
-- Performance indexes
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_client_widgets_client_id ON client_widgets(client_id);
```

### Step 3: Seed Default Data (Optional)

If migrating existing users, create default clients:

```typescript
// Migration script
for (const user of existingUsers) {
  const client = await db.insert(clients).values({
    userId: user.id,
    name: `${user.username}'s Client`,
    publicApiKey: generateApiKey(),
    allowedDomains: [],
    status: 'active',
  }).returning();
  
  await db.insert(clientWidgets).values({
    clientId: client[0].id,
    // Use defaults
  });
}
```

---

## 7. Backward Compatibility

### Users Table

**NO CHANGES REQUIRED** ✅

The existing `users` table remains unchanged. All existing authentication code continues to work without modification.

### Storage Interface

Update `server/storage.ts` interface:

```typescript
export interface IStorage {
  // Existing methods (unchanged)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // New methods
  getClient(id: string): Promise<Client | undefined>;
  getClientsByUserId(userId: string): Promise<Client[]>;
  getClientByApiKey(apiKey: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  
  getClientWidget(clientId: string): Promise<ClientWidget | undefined>;
  createClientWidget(widget: InsertClientWidget): Promise<ClientWidget>;
  updateClientWidget(clientId: string, widget: Partial<InsertClientWidget>): Promise<ClientWidget>;
}
```

---

## 8. Security Considerations

### API Key Generation

```typescript
import { randomBytes } from 'crypto';

function generateApiKey(): string {
  // Generate secure 32-byte random key
  return `ccw_${randomBytes(32).toString('hex')}`;
}
```

### CORS Validation

```typescript
function isOriginAllowed(origin: string, allowedDomains: string[]): boolean {
  return allowedDomains.some(domain => {
    // Exact match or subdomain match
    return origin === domain || origin.endsWith(`.${domain}`);
  });
}
```

### Rate Limiting

Implement per-client rate limits based on `publicApiKey` to prevent abuse.

---

## 9. Testing Strategy

### Unit Tests

```typescript
describe('Multi-tenant schema', () => {
  it('should isolate client data', async () => {
    const client1 = await createClient(user1.id);
    const client2 = await createClient(user2.id);
    
    const widgets1 = await getClientWidgets(client1.id);
    const widgets2 = await getClientWidgets(client2.id);
    
    expect(widgets1).not.toContain(widgets2[0]);
  });
  
  it('should enforce unique API keys', async () => {
    const apiKey = 'test_key';
    await createClient(user1.id, apiKey);
    
    await expect(
      createClient(user2.id, apiKey)
    ).rejects.toThrow('unique constraint');
  });
});
```

### Integration Tests

1. Test client creation workflow
2. Test widget configuration CRUD
3. Test API key authentication
4. Test CORS domain validation

---

## 10. Performance Optimization

### Recommended Indexes

```sql
-- Already covered in migration, but worth emphasizing:
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_public_api_key ON clients(public_api_key); -- For auth lookup
CREATE INDEX idx_client_widgets_client_id ON client_widgets(client_id);
```

### Query Optimization Tips

1. **Use select() with specific columns** instead of select all
2. **Always include clientId filter** in WHERE clause
3. **Use .limit(1)** when expecting single results
4. **Consider caching** API key → clientId mappings (Redis)

---

## 11. Future Enhancements

### Potential Extensions

1. **Client Plans**: Add `planType` and `planLimits` columns
2. **Usage Tracking**: Add `chatMessages` table with `clientId` FK
3. **Team Members**: Add `clientUsers` junction table for team access
4. **Webhooks**: Add `clientWebhooks` for event notifications
5. **Audit Logs**: Track all client configuration changes

### Schema Evolution

The design supports adding:
- Multiple widgets per client (remove unique constraint on clientId)
- Widget themes/templates (add `templateId` FK)
- Custom branding assets (add `logoUrl`, `brandColors` columns)

---

## 12. Implementation Checklist

- [ ] Update `shared/schema.ts` with new tables
- [ ] Add Zod validation schemas
- [ ] Export TypeScript types
- [ ] Update `server/storage.ts` interface
- [ ] Implement storage methods (MemStorage)
- [ ] Create Drizzle migration
- [ ] Run migration on database
- [ ] Update API routes to use clientId filtering
- [ ] Add API key authentication middleware
- [ ] Update frontend to handle multi-tenant context
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update API documentation

---

## 13. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data leakage between clients | HIGH | Enforce clientId filtering in all queries |
| API key exposure | HIGH | Use HTTPS only, rotate keys periodically |
| Missing indexes causing slow queries | MEDIUM | Add recommended indexes during migration |
| Breaking existing code | LOW | Users table unchanged, storage interface extended |

---

## Conclusion

This implementation plan provides a robust, secure, and scalable multi-tenant architecture for the ChatConnect Dashboard. The design follows Drizzle ORM best practices, maintains backward compatibility, and sets up a foundation for future SaaS features.

**Ready to implement: ✅**

The schema additions are well-defined, type-safe, and follow all existing patterns consistently.

---

*Document created: 2025-10-19*
*Confidence Rating: 9/10*
