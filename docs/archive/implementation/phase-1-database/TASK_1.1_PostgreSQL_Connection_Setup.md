# Task 1.1: PostgreSQL Connection Setup

**Phase:** Phase 1 - Database Integration  
**Duration Estimate:** 2-4 hours  
**Confidence Target:** 9/10  
**Status:** 🔵 Ready to Start  

---

## Task Overview

### Objective
Replace the current in-memory storage with a PostgreSQL database connection, ensuring all tables are created with proper indexes and the system can perform multi-tenant CRUD operations.

### Why This Task Matters
Currently, all data (widget configs, clients, API keys) is stored in memory, which means:
- Data is lost when server restarts
- Can't scale beyond single server
- No persistence for production use
- Can't perform complex queries or reporting

This task establishes the foundation for all future database work and is critical for production readiness.

### Success Criteria
- [ ] PostgreSQL database created and accessible
- [ ] Database connection configured with proper environment variables
- [ ] All tables created via `db:push` command
- [ ] Indexes verified on `clientId` and `apiKey` columns
- [ ] Connection tested with simple query
- [ ] Drizzle Studio can browse all tables
- [ ] Documentation updated with setup instructions
- [ ] Confidence rating: 9/10 or higher

---

## Current State Analysis

### What Exists Now

**Database Schema (Defined but not connected):**
- File: `shared/schema.ts`
- Tables: 8 tables defined with Drizzle ORM
- Status: Schema is complete and well-designed, just needs to be pushed to database

**Relevant Files:**
```
shared/
├── schema.ts              # Database schema (Drizzle)
└── types.ts               # TypeScript types

server/
├── src/
│   ├── db.ts             # Database connection (needs setup)
│   └── lib/
│       └── storage.ts     # In-memory storage (to be replaced later)

.env.example              # Template for environment variables
drizzle.config.ts         # Drizzle configuration
package.json              # Scripts including db:push
```

**Current In-Memory Storage:**
- File: `server/src/lib/storage.ts`
- Data structures: Maps for clients, widgets, API keys
- Status: Working but temporary (will be replaced in Task 1.2)

### What's Missing

1. **PostgreSQL Installation**
   - Local database server not set up
   - Database `chatconnect` doesn't exist

2. **Environment Configuration**
   - `.env` file not created
   - `DATABASE_URL` not configured

3. **Connection Pool Setup**
   - No connection pool configuration
   - No error handling for connection failures
   - No connection retry logic

4. **Table Creation**
   - Tables defined in schema but not created in database
   - Indexes not created
   - Foreign keys not established

5. **Verification**
   - No test script to verify connection
   - Haven't confirmed Drizzle Studio works

---

## Prerequisites

### Required Software

**PostgreSQL 14+:**
```bash
# macOS (Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt-get install postgresql-14
sudo systemctl start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/
```

**Node.js 20+:**
```bash
node --version  # Should be v20.x or higher
```

**Project Dependencies:**
```bash
# Already installed via npm install
- drizzle-orm
- postgres (or pg)
- drizzle-kit
```

---

## Implementation Steps

### Step 1: Create PostgreSQL Database

**Create the database:**
```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE chatconnect;

# Create user (optional, for better security)
CREATE USER chatconnect_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE chatconnect TO chatconnect_user;

# Exit psql
\q
```

**Verify database exists:**
```bash
psql -l | grep chatconnect
```

**Expected output:**
```
chatconnect      | chatconnect_user | UTF8     | ...
```

---

### Step 2: Configure Environment Variables

**Create `.env` file in project root:**

```bash
# Copy from example
cp .env.example .env
```

**Edit `.env` and add database configuration:**

```env
# Database Configuration
DATABASE_URL="postgresql://chatconnect_user:your_secure_password@localhost:5432/chatconnect"

# Connection Pool Settings (optional, good defaults)
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000

# Existing variables (don't remove these)
JWT_SECRET="your-existing-jwt-secret"
PORT=5000
# ... other existing variables ...
```

**Connection string format:**
```
postgresql://[username]:[password]@[host]:[port]/[database]
```

**Common configurations:**

```env
# Local development (default postgres user)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatconnect"

# Local development (custom user)
DATABASE_URL="postgresql://chatconnect_user:password123@localhost:5432/chatconnect"

# Production (with SSL)
DATABASE_URL="postgresql://user:pass@prod-host:5432/chatconnect?sslmode=require"
```

---

### Step 3: Set Up Database Connection

**Review existing `server/src/db.ts`:**

This file should already have Drizzle setup, but verify it includes:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../shared/schema';

// Get connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres client with connection pool
const client = postgres(connectionString, {
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idle_timeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
  // Add connection retry logic
  max_lifetime: 60 * 30, // 30 minutes
  connect_timeout: 10, // 10 seconds
  onnotice: () => {}, // Suppress notices
});

// Create Drizzle instance
export const db = drizzle(client, { schema });

// Export client for raw queries if needed
export { client };
```

**Add connection test function:**

```typescript
// Add this to server/src/db.ts

/**
 * Test database connection
 * Useful for health checks and startup verification
 */
export async function testConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
```

**Add graceful shutdown:**

```typescript
// Add this to server/src/db.ts

/**
 * Close database connection gracefully
 * Call this when shutting down the server
 */
export async function closeConnection(): Promise<void> {
  try {
    await client.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}
```

---

### Step 4: Update Server Startup

**Modify `server/src/index.ts` to test connection on startup:**

```typescript
import express from 'express';
import { testConnection, closeConnection } from './db';

const app = express();
const PORT = process.env.PORT || 5000;

// ... existing middleware ...

// Test database connection before starting server
async function startServer() {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await closeConnection();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await closeConnection();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

---

### Step 5: Push Database Schema

**Review the schema file:**
```bash
cat shared/schema.ts
```

**Expected tables:**
1. `clients` - Client organizations
2. `users` - Dashboard users
3. `widget_config` - Widget configuration
4. `widget_styles` - Widget appearance
5. `conversations` - Chat conversations
6. `messages` - Individual messages
7. `knowledge_base` - Documents/knowledge
8. `tags` - Tag definitions

**Run Drizzle push to create tables:**

```bash
npm run db:push
```

**Expected output:**
```
📦 Drizzle ORM
🔍 Scanning schema...
✅ Found 8 tables
🚀 Pushing schema to database...
✅ clients table created
✅ users table created
✅ widget_config table created
✅ widget_styles table created
✅ conversations table created
✅ messages table created
✅ knowledge_base table created
✅ tags table created
✅ Schema push complete
```

**If there are errors:**
- Check `DATABASE_URL` is correct
- Verify database exists
- Check user has proper permissions
- Review error message for specific issues

---

### Step 6: Verify Tables and Indexes

**Method 1: Use Drizzle Studio**

```bash
npm run db:studio
```

This should open Drizzle Studio in your browser (usually `http://localhost:4983`)

**Verify:**
- [ ] All 8 tables are visible
- [ ] Each table has proper columns
- [ ] Foreign keys are established
- [ ] Can browse empty tables

**Method 2: Use psql**

```bash
psql -d chatconnect

-- List all tables
\dt

-- Describe specific table
\d clients
\d widget_config

-- View indexes
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public';

-- Exit
\q
```

**Critical indexes to verify:**
```sql
-- These should exist for multi-tenant isolation and performance
clients_pkey             ON clients (id)
widget_config_pkey       ON widget_config (id)
widget_config_client_id  ON widget_config (client_id)
widget_config_api_key    ON widget_config (api_key)
conversations_client_id  ON conversations (client_id)
messages_conversation_id ON messages (conversation_id)
knowledge_base_client_id ON knowledge_base (client_id)
```

**If indexes are missing, they should be in the schema. Check `shared/schema.ts`.**

---

### Step 7: Test CRUD Operations

**Create a test script: `server/src/test-db.ts`**

```typescript
import { db } from './db';
import { clients, widgetConfig } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function testDatabase() {
  console.log('🧪 Testing database operations...\n');

  try {
    // Test 1: Create a test client
    console.log('1️⃣ Creating test client...');
    const [newClient] = await db.insert(clients).values({
      id: crypto.randomUUID(),
      name: 'Test Client',
      email: 'test@example.com',
      apiKey: 'test_api_key_' + Date.now(),
      allowedDomains: ['localhost:3000', 'example.com'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    console.log('✅ Client created:', newClient.id);

    // Test 2: Read the client
    console.log('\n2️⃣ Reading client...');
    const foundClient = await db.query.clients.findFirst({
      where: eq(clients.id, newClient.id),
    });
    console.log('✅ Client found:', foundClient?.name);

    // Test 3: Create widget config for client
    console.log('\n3️⃣ Creating widget config...');
    const [newWidget] = await db.insert(widgetConfig).values({
      id: crypto.randomUUID(),
      clientId: newClient.id,
      title: 'Test Widget',
      welcomeMessage: 'Hello! How can I help you?',
      primaryColor: '#3B82F6',
      position: 'bottom-right',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    console.log('✅ Widget created:', newWidget.id);

    // Test 4: Query with clientId filter (multi-tenant)
    console.log('\n4️⃣ Testing multi-tenant query...');
    const clientWidgets = await db.query.widgetConfig.findMany({
      where: eq(widgetConfig.clientId, newClient.id),
    });
    console.log('✅ Found', clientWidgets.length, 'widget(s) for client');

    // Test 5: Update widget
    console.log('\n5️⃣ Updating widget...');
    await db.update(widgetConfig)
      .set({ 
        title: 'Updated Test Widget',
        updatedAt: new Date(),
      })
      .where(eq(widgetConfig.id, newWidget.id));
    console.log('✅ Widget updated');

    // Test 6: Delete test data (cleanup)
    console.log('\n6️⃣ Cleaning up test data...');
    await db.delete(widgetConfig).where(eq(widgetConfig.id, newWidget.id));
    await db.delete(clients).where(eq(clients.id, newClient.id));
    console.log('✅ Test data cleaned up');

    console.log('\n✅ All database tests passed!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Database test failed:', error);
    process.exit(1);
  }
}

testDatabase();
```

**Add test script to package.json:**

```json
{
  "scripts": {
    "test:db": "tsx server/src/test-db.ts"
  }
}
```

**Run the test:**
```bash
npm run test:db
```

**Expected output:**
```
🧪 Testing database operations...

1️⃣ Creating test client...
✅ Client created: abc-123-...

2️⃣ Reading client...
✅ Client found: Test Client

3️⃣ Creating widget config...
✅ Widget created: def-456-...

4️⃣ Testing multi-tenant query...
✅ Found 1 widget(s) for client

5️⃣ Updating widget...
✅ Widget updated

6️⃣ Cleaning up test data...
✅ Test data cleaned up

✅ All database tests passed!
```

---

### Step 8: Document the Setup

**Update `docs/DEVELOPMENT.md` with database setup section:**

```markdown
## Database Setup

### PostgreSQL Installation

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-14
sudo systemctl start postgresql
```

### Database Creation

```bash
# Create database
psql postgres
CREATE DATABASE chatconnect;
\q
```

### Environment Configuration

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatconnect"
   ```

### Schema Setup

```bash
# Push schema to database
npm run db:push

# Open database GUI
npm run db:studio
```

### Testing Connection

```bash
# Run database tests
npm run test:db
```

### Troubleshooting

**Connection refused:**
- Check PostgreSQL is running: `pg_isready`
- Verify connection string in `.env`

**Authentication failed:**
- Check username/password in connection string
- Verify user exists: `psql -l`

**Tables not created:**
- Run `npm run db:push`
- Check for errors in schema file
- Verify user has CREATE privileges
```

**Update `README.md` if needed:**

Add database setup to Quick Start section:
```markdown
## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL:**
   ```bash
   # Create database
   psql postgres -c "CREATE DATABASE chatconnect;"
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and set DATABASE_URL
   ```

4. **Push database schema:**
   ```bash
   npm run db:push
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```
```

---

## Testing & Verification

### Manual Testing Checklist

**Connection:**
- [ ] Server starts without database errors
- [ ] "✅ Database connection successful" appears in logs
- [ ] No connection timeout errors

**Tables:**
- [ ] All 8 tables exist in database
- [ ] Can view tables in Drizzle Studio
- [ ] Tables are empty (no data yet)

**Indexes:**
- [ ] `client_id` columns are indexed
- [ ] `api_key` columns are indexed
- [ ] Foreign keys are established

**CRUD Operations:**
- [ ] Can create records (test script passes)
- [ ] Can read records (test script passes)
- [ ] Can update records (test script passes)
- [ ] Can delete records (test script passes)
- [ ] Multi-tenant query works (filters by clientId)

**Drizzle Studio:**
- [ ] Opens successfully (`npm run db:studio`)
- [ ] Shows all tables
- [ ] Can browse table schemas
- [ ] Can add/edit/delete records through UI

**Error Handling:**
- [ ] Server handles database connection failure gracefully
- [ ] Error messages are clear and helpful
- [ ] Server attempts reconnection on connection loss

---

## Common Issues & Solutions

### Issue 1: Connection Refused

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
# macOS:
brew services start postgresql@14

# Ubuntu:
sudo systemctl start postgresql

# Verify it's listening on port 5432
lsof -i :5432
```

---

### Issue 2: Authentication Failed

**Error:**
```
Error: password authentication failed for user "postgres"
```

**Solutions:**
```bash
# Reset postgres password
psql postgres
ALTER USER postgres PASSWORD 'newpassword';
\q

# Update .env
DATABASE_URL="postgresql://postgres:newpassword@localhost:5432/chatconnect"
```

---

### Issue 3: Database Does Not Exist

**Error:**
```
Error: database "chatconnect" does not exist
```

**Solution:**
```bash
# Create the database
psql postgres -c "CREATE DATABASE chatconnect;"

# Verify it exists
psql -l | grep chatconnect
```

---

### Issue 4: Permission Denied

**Error:**
```
Error: permission denied to create database
```

**Solution:**
```bash
# Grant permissions to user
psql postgres
GRANT ALL PRIVILEGES ON DATABASE chatconnect TO postgres;
\q
```

---

### Issue 5: Tables Not Created

**Error:**
```
Schema push failed
```

**Solutions:**
```bash
# Check schema file for errors
cat shared/schema.ts

# Try generating migration instead
npx drizzle-kit generate:pg

# Check generated SQL
cat drizzle/[timestamp]_migration.sql

# Apply manually if needed
psql -d chatconnect -f drizzle/[timestamp]_migration.sql
```

---

### Issue 6: Port Already in Use

**Error:**
```
Error: Port 5432 is already in use
```

**Solution:**
```bash
# Check what's using the port
lsof -i :5432

# If it's an old PostgreSQL instance
brew services stop postgresql@14
brew services start postgresql@14
```

---

## Code Review Checklist

When reviewing this task, verify:

**Environment Configuration:**
- [ ] `.env` file created and not committed to git
- [ ] `DATABASE_URL` is correct
- [ ] `.gitignore` includes `.env`

**Database Connection:**
- [ ] `server/src/db.ts` has proper connection setup
- [ ] Connection pool configured
- [ ] Error handling implemented
- [ ] Graceful shutdown implemented

**Schema:**
- [ ] All tables created successfully
- [ ] Indexes on `clientId` and `apiKey` exist
- [ ] Foreign keys established
- [ ] No migration errors

**Testing:**
- [ ] Test script runs successfully
- [ ] All CRUD operations work
- [ ] Multi-tenant filtering works
- [ ] Drizzle Studio accessible

**Documentation:**
- [ ] `docs/DEVELOPMENT.md` updated
- [ ] `README.md` updated if needed
- [ ] Setup steps clear and complete

**Code Quality:**
- [ ] No hardcoded credentials
- [ ] Proper error handling
- [ ] TypeScript types correct
- [ ] Console logs helpful
- [ ] Code follows project patterns

---

## 🛑 CHECKPOINT 1.1: Review Format

When this task is complete, Cline should provide a checkpoint in this format:

```markdown
🛑 CHECKPOINT 1.1: PostgreSQL Connection Setup Complete

**What was completed:**
- Created local PostgreSQL database 'chatconnect'
- Configured .env with DATABASE_URL
- Set up connection pool with max 20 connections
- Added connection test on server startup
- Ran db:push - all 8 tables created successfully
- Verified schema in Drizzle Studio
- Created and ran test script - all CRUD operations work
- Updated docs/DEVELOPMENT.md with setup instructions

**Changes made:**
- `.env`: Added DATABASE_URL and connection pool settings
- `server/src/db.ts`: Added connection test and graceful shutdown
- `server/src/index.ts`: Added database connection test on startup
- `server/src/test-db.ts`: Created database test script (NEW FILE)
- `package.json`: Added test:db script
- `docs/DEVELOPMENT.md`: Added database setup section

**Testing done:**
- ✅ Database connection: Success
- ✅ Table creation: All 8 tables created
- ✅ Indexes: clientId and apiKey indexed on relevant tables
- ✅ Drizzle Studio: Can browse all tables
- ✅ Test script: All CRUD operations pass
- ✅ Multi-tenant query: Filters by clientId correctly
- ✅ Server startup: Connects successfully and logs confirmation
- ✅ Graceful shutdown: Closes connection properly

**Files created:**
- `server/src/test-db.ts` - Database test script

**Files modified:**
- `.env` - Database configuration (not committed)
- `server/src/db.ts` - Connection setup and helpers
- `server/src/index.ts` - Added connection test on startup
- `package.json` - Added test:db script
- `docs/DEVELOPMENT.md` - Database setup documentation

**Confidence:** 9/10

**Reason for confidence rating:**
Everything is working smoothly. Database connection is stable, all tables 
created with proper indexes, and CRUD operations are working. Connection 
pool is configured with good defaults. Test script passes all checks.

Minor point: Haven't tested connection retry logic under failure conditions,
but the basic error handling is solid.

**Questions for review:**
1. ✅ Database connection successful and stable?
2. ✅ All 8 tables created with correct schema?
3. ✅ Indexes in place for clientId and apiKey?
4. ✅ Test script passes - CRUD operations work?
5. ✅ Drizzle Studio accessible and shows all tables?
6. ❓ Connection pool max (20) - is this appropriate for expected load?
7. ❓ Should I add connection retry logic now or in a future task?

**Ready for:**
- [ ] Code review by Thong
- [ ] Manual testing by Thong
- [ ] Proceed to Task 1.2 (Migrate Data Operations to Database)

**Next steps:**
Once approved, I'll proceed to Task 1.2 where we'll:
- Replace in-memory storage with database queries
- Update all API endpoints to use database
- Ensure all queries include clientId filtering
- Test multi-tenant isolation thoroughly
```

---

## Success Metrics

**This task is complete when:**

✅ **Connection established:**
- PostgreSQL running and accessible
- Server connects on startup
- No connection errors in logs

✅ **Schema deployed:**
- All 8 tables created
- Indexes on clientId and apiKey exist
- Foreign keys established

✅ **Verification passed:**
- Drizzle Studio shows all tables
- Test script passes all CRUD operations
- Multi-tenant queries work

✅ **Documentation updated:**
- Setup instructions in docs/DEVELOPMENT.md
- README.md updated with quick start
- Troubleshooting guide included

✅ **Code quality:**
- No hardcoded credentials
- Proper error handling
- Graceful shutdown implemented
- TypeScript types correct

✅ **Confidence achieved:**
- Confidence rating: 9/10 or higher
- All questions answered
- Ready to proceed to next task

---

## Next Task Preview

**Task 1.2: Migrate Data Operations to Database**

After completing this task, the next step will be to:
1. Replace in-memory storage in `server/src/lib/storage.ts`
2. Update all API endpoints to use database queries
3. Ensure all queries include `clientId` filtering
4. Test multi-tenant isolation thoroughly
5. Remove in-memory storage code

**Estimated time:** 4-6 hours  
**Confidence target:** 8/10

---

## Additional Resources

**Documentation:**
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [postgres npm package](https://www.npmjs.com/package/postgres)

**Project docs:**
- `docs/ARCHITECTURE.md` - System design
- `docs/MULTI_TENANT_SCHEMA_PLAN.md` - Database schema details
- `shared/schema.ts` - Table definitions

**Useful commands:**
```bash
# Database
psql -d chatconnect              # Connect to database
\dt                              # List tables
\d table_name                    # Describe table
\di                              # List indexes

# Drizzle
npm run db:push                  # Push schema changes
npm run db:studio                # Open database GUI
npx drizzle-kit generate:pg      # Generate migration

# Testing
npm run test:db                  # Run database tests
npm run dev                      # Start dev server
```

---

**Task Status:** 🟢 Ready to Start  
**Assigned to:** Cline + Thong Review  
**Priority:** High (Foundational task)  
**Blocking:** Task 1.2, Task 1.3

---

## How to Use This Document

### For Thong:

**Option 1: Direct prompt to Cline:**
```
Cline, please complete Task 1.1: PostgreSQL Connection Setup.

The complete task specification is in:
@TASK_1.1_PostgreSQL_Connection_Setup.md

Please:
1. Read the task document carefully
2. Analyze the current state
3. State your understanding and approach
4. Rate your confidence
5. Ask any questions before proceeding
6. Implement step by step
7. Provide checkpoint report when complete
```

**Option 2: Break it down:**
```
Cline, let's work on PostgreSQL connection setup.

First, read @TASK_1.1_PostgreSQL_Connection_Setup.md and tell me:
1. What you understand we need to accomplish
2. Your proposed approach
3. Any concerns or questions
4. Your confidence level (1-10)
```

### For Cline:

When given this task:
1. ✅ Read the entire document
2. ✅ Review referenced files (`shared/schema.ts`, `server/src/db.ts`)
3. ✅ State understanding and approach
4. ✅ Ask questions if anything is unclear
5. ✅ Implement step by step
6. ✅ Test thoroughly
7. ✅ Provide checkpoint report
8. ✅ Wait for approval before proceeding

---

**Last Updated:** 2024-11-18  
**Version:** 1.0  
**Status:** ✅ Ready for Implementation