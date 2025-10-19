# Backend Setup Guide

**Version:** 1.0  
**Last Updated:** January 19, 2025  
**Estimated Setup Time:** 4-6 hours

## Overview

This guide walks you through setting up all backend services required for the Conference Chat Dashboard:

1. **PostgreSQL Database** - Persistent data storage
2. **Directus** - Headless CMS for knowledge base management
3. **n8n** - Workflow automation for chat processing
4. **External Services** - LLM provider (OpenAI/Anthropic)

By the end of this guide, you'll have a fully integrated backend ready for production.

---

## Prerequisites

### Required Accounts
- [ ] GitHub account (for deployment)
- [ ] Neon or Supabase account (PostgreSQL hosting)
- [ ] Railway or Render account (for n8n/Directus hosting)
- [ ] OpenAI or Anthropic API account (LLM provider)

### Required Tools
- [ ] Node.js 18+ installed
- [ ] npm or pnpm installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)
- [ ] Command line access

### Knowledge Requirements
- Basic understanding of databases
- Familiarity with REST APIs
- Basic environment variable configuration
- Command line basics

---

## Part 1: PostgreSQL Database Setup

### Option A: Neon (Recommended)

**Why Neon:**
- Serverless PostgreSQL (auto-scaling)
- Free tier includes 0.5 GB storage
- Built-in connection pooling
- Excellent for development and production

#### Step 1: Create Neon Project

1. Go to https://neon.tech
2. Sign up or log in
3. Click "Create a project"
4. Configure:
   - **Project name:** conference-chat-db
   - **Region:** Choose closest to your users
   - **PostgreSQL version:** 16 (latest)
5. Click "Create Project"

#### Step 2: Get Connection String

1. In your Neon dashboard, click "Connection Details"
2. Select "Pooled connection" (recommended)
3. Copy the connection string:
   ```
   postgresql://user:password@host.neon.tech/dbname?sslmode=require
   ```
4. Save this securely - you'll need it soon

#### Step 3: Update Environment Variables

Create or update `.env` file in your project root:

```bash
# Database
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Session Store (use same database)
SESSION_DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

#### Step 4: Push Database Schema

```bash
# Install dependencies if not already done
npm install

# Push schema to database
npm run db:push
```

**Expected Output:**
```
✓ Applying changes...
✓ Schema pushed successfully
✓ Tables created: users, clients, client_widgets
```

#### Step 5: Verify Database

1. In Neon dashboard, click "Tables"
2. You should see:
   - `users` table
   - `clients` table
   - `client_widgets` table
   - `drizzle_migrations` table (metadata)

---

### Option B: Supabase

**Why Supabase:**
- Includes additional features (auth, storage, edge functions)
- Free tier includes 500 MB storage
- Nice dashboard for managing data
- Real-time subscriptions (for future use)

#### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Configure:
   - **Project name:** conference-chat
   - **Database password:** (create a strong password)
   - **Region:** Choose closest to your users
5. Click "Create New Project"
6. Wait 2-3 minutes for provisioning

#### Step 2: Get Connection String

1. In Supabase dashboard, go to "Settings" → "Database"
2. Scroll to "Connection string"
3. Select "URI" tab
4. Copy the connection string and replace `[YOUR-PASSWORD]` with your database password
5. Save this securely

#### Step 3: Configure and Push Schema

Same as Neon steps 3-5 above.

---

### Option C: Local PostgreSQL (Development Only)

**For local development only - NOT for production**

#### Step 1: Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

#### Step 2: Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE conference_chat;

# Create user
CREATE USER confchat_user WITH PASSWORD 'your_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE conference_chat TO confchat_user;

# Exit
\q
```

#### Step 3: Configure Environment

```bash
DATABASE_URL=postgresql://confchat_user:your_password_here@localhost:5432/conference_chat
```

#### Step 4: Push Schema

```bash
npm run db:push
```

---

## Part 2: Directus Setup

Directus will store your knowledge base documents, tags, and system prompts with multi-tenant isolation.

### Option A: Directus Cloud (Easiest)

#### Step 1: Create Directus Cloud Project

1. Go to https://directus.cloud
2. Sign up for an account
3. Click "Create Project"
4. Configure:
   - **Project name:** conference-chat-kb
   - **Region:** Choose closest to your users
   - **Plan:** Start with free tier
5. Click "Create Project"
6. Wait for provisioning (2-3 minutes)

#### Step 2: Access Directus Admin

1. You'll receive your Directus URL: `https://your-project.directus.app`
2. Create your admin account:
   - **Email:** your-email@example.com
   - **Password:** (strong password)
3. Log in to Directus admin panel

---

### Option B: Self-Hosted Directus (Railway/Render)

#### Using Railway

**Step 1: Deploy PostgreSQL (for Directus)**

1. Go to https://railway.app
2. Sign up or log in
3. Click "New Project" → "Provision PostgreSQL"
4. Name it "directus-db"
5. Copy the connection string from "Connect" tab

**Step 2: Deploy Directus**

1. In Railway, click "New" → "Empty Service"
2. Name it "directus"
3. Go to "Settings" → "Environment Variables"
4. Add these variables:

```bash
# Directus Configuration
KEY=your-random-32-char-key-here
SECRET=your-random-64-char-secret-here

# Database (from step 1)
DB_CLIENT=pg
DB_HOST=your-postgres-host.railway.app
DB_PORT=5432
DB_DATABASE=railway
DB_USER=postgres
DB_PASSWORD=your-postgres-password
DB_SSL=true

# Admin User
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-admin-password

# Public URL (will get after deployment)
PUBLIC_URL=https://your-service.railway.app

# CORS (allow your dashboard)
CORS_ENABLED=true
CORS_ORIGIN=true
```

5. Go to "Settings" → "Docker Image"
6. Set image: `directus/directus:latest`
7. Click "Deploy"
8. Once deployed, go to "Settings" → "Networking" → "Generate Domain"
9. Copy your Directus URL
10. Update `PUBLIC_URL` environment variable with this URL
11. Redeploy

**Step 3: Access Directus**

1. Visit your Railway-provided URL
2. Log in with ADMIN_EMAIL and ADMIN_PASSWORD
3. You're in!

---

### Creating Directus Collections

**Whether you used Cloud or Self-hosted, follow these steps:**

#### Collection 1: Knowledge Base Documents

1. In Directus admin, click "Settings" (gear icon)
2. Click "Data Model"
3. Click "Create Collection"
4. Configure:
   - **Name:** `knowledge_base`
   - **Type:** Standard
   - **Primary Key:** Auto-increment ID
5. Click "Save"

6. Add Fields:

**Field: client_id**
- Type: UUID
- Interface: Input
- Required: Yes
- Note: This ensures multi-tenant isolation

**Field: document_name**
- Type: String
- Interface: Input
- Required: Yes
- Max Length: 255

**Field: document_content**
- Type: Text
- Interface: Textarea
- Required: Yes
- Note: Full text content of the document

**Field: document_type**
- Type: String
- Interface: Dropdown
- Options: pdf, docx, txt, csv, md
- Required: Yes

**Field: document_url**
- Type: String
- Interface: Input
- Note: Optional URL to original document

**Field: tags**
- Type: JSON
- Interface: Tags
- Note: Array of tag IDs

**Field: vector_embedding**
- Type: JSON
- Interface: Code (JSON)
- Note: For future vector search

**Field: metadata**
- Type: JSON
- Interface: Code (JSON)
- Note: Additional document metadata

**Field: status**
- Type: String
- Interface: Dropdown
- Options: processing, ready, failed
- Default: processing
- Required: Yes

**Field: created_at**
- Type: Timestamp
- Interface: Datetime
- Default: Now
- Readonly: Yes

**Field: updated_at**
- Type: Timestamp
- Interface: Datetime
- Default: Now
- Readonly: Yes
- Update: On Update

7. Click "Save Collection"

---

#### Collection 2: Tags

1. Create new collection: `tags`
2. Add fields:

**Field: client_id**
- Type: UUID
- Interface: Input
- Required: Yes

**Field: name**
- Type: String
- Interface: Input
- Required: Yes
- Max Length: 100

**Field: color**
- Type: String
- Interface: Color
- Default: #3b82f6
- Required: Yes

**Field: system_prompt**
- Type: Text
- Interface: Textarea
- Note: Tag-specific AI instructions

**Field: created_at**
- Type: Timestamp
- Interface: Datetime
- Default: Now
- Readonly: Yes

3. Click "Save Collection"

---

#### Collection 3: System Prompts (Optional)

1. Create new collection: `system_prompts`
2. Add fields:

**Field: client_id**
- Type: UUID
- Interface: Input
- Required: Yes

**Field: prompt_text**
- Type: Text
- Interface: Textarea
- Required: Yes
- Note: Main system prompt for AI

**Field: is_active**
- Type: Boolean
- Interface: Toggle
- Default: true

**Field: created_at**
- Type: Timestamp
- Interface: Datetime
- Default: Now

3. Click "Save Collection"

---

### Configuring Directus Roles & Permissions

**CRITICAL: This ensures client data isolation**

#### Create API Role

1. Click "Settings" → "Roles & Permissions"
2. Click "Create Role"
3. Configure:
   - **Name:** API Access
   - **Description:** For n8n workflow access
   - **App Access:** No
   - **Admin Access:** No
4. Click "Save"

#### Set Permissions for knowledge_base

1. Click on "API Access" role
2. Find `knowledge_base` collection
3. Configure permissions:

**Create:**
- Access: Custom
- Field Permissions: All fields
- Field Validation: client_id is required

**Read:**
- Access: Custom
- Permissions: `client_id equals $CLIENT_ID`
- Field Permissions: All fields

**Update:**
- Access: Custom
- Permissions: `client_id equals $CLIENT_ID`
- Field Permissions: All fields

**Delete:**
- Access: Custom
- Permissions: `client_id equals $CLIENT_ID`

4. Repeat for `tags` and `system_prompts` collections

---

### Generate Directus API Token

1. Click "Settings" → "Access Tokens"
2. Click "Create Token"
3. Configure:
   - **Name:** n8n-workflow-access
   - **Role:** API Access
   - **Expiration:** Never (or set to 1 year)
4. Click "Save"
5. **Copy the token immediately** - you won't see it again!
6. Save it securely

**Example token:**
```
wSfvZ7TyGzN7jLKsDJYQz8mKGvF2E3Km
```

---

### Test Directus Setup

```bash
# Test API access
curl -X GET \
  'https://your-directus.app/items/knowledge_base' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'

# Expected: Empty array or existing documents
# {"data": []}
```

---

## Part 3: n8n Workflow Setup

n8n orchestrates the chat processing: receives requests, queries knowledge base, calls LLM, returns responses.

### Option A: n8n Cloud (Easiest)

#### Step 1: Create n8n Cloud Account

1. Go to https://n8n.io
2. Click "Get Started"
3. Sign up for n8n Cloud
4. Select plan (Start with free trial)
5. Create your workspace

#### Step 2: Access n8n Editor

1. Click "Open Editor"
2. You'll see the n8n workflow canvas
3. This is where you'll build the chat workflow

---

### Option B: Self-Hosted n8n (Railway/Render)

#### Using Railway

1. Go to https://railway.app
2. Click "New Project" → "Empty Project"
3. Click "New" → "Docker Image"
4. Configure:
   - **Name:** n8n
   - **Docker Image:** `n8nio/n8n:latest`
   
5. Set Environment Variables:

```bash
# Basic Configuration
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password

# Webhook URL (get after deployment)
WEBHOOK_URL=https://your-n8n.railway.app

# Execution
N8N_PAYLOAD_SIZE_MAX=16

# Timezone
GENERIC_TIMEZONE=America/New_York
```

6. Go to "Settings" → "Networking" → "Generate Domain"
7. Copy your n8n URL
8. Update `WEBHOOK_URL` with this URL
9. Visit your n8n URL and log in

---

### Creating the Chat Processing Workflow

#### Step 1: Create New Workflow

1. In n8n editor, click "+ Add workflow"
2. Name it: "Conference Chat Processing"
3. Click "Save"

#### Step 2: Add Webhook Trigger

1. Click the "+" button
2. Search for "Webhook"
3. Select "Webhook" node
4. Configure:
   - **HTTP Method:** POST
   - **Path:** chat (or your preferred path)
   - **Authentication:** None (we handle this in our app)
   - **Respond:** Using 'Respond to Webhook' Node
5. Click "Execute Node" to test
6. Copy the **Webhook URL** - you'll need this!

Example: `https://your-n8n.app/webhook/chat`

---

#### Step 3: Add Client ID Extraction

1. Click "+" after Webhook node
2. Search for "Code"
3. Select "Code" node
4. Name it: "Extract Client ID"
5. Add this code:

```javascript
// Extract data from webhook
const clientId = $json.body.clientId;
const message = $json.body.message;
const sessionId = $json.body.sessionId;
const metadata = $json.body.metadata || {};

// Validate required fields
if (!clientId || !message || !sessionId) {
  throw new Error('Missing required fields: clientId, message, or sessionId');
}

return {
  clientId,
  message,
  sessionId,
  metadata,
  timestamp: new Date().toISOString()
};
```

6. Click "Execute Node" to test

---

#### Step 4: Query Directus for Knowledge Base

1. Click "+" after Code node
2. Search for "HTTP Request"
3. Select "HTTP Request" node
4. Name it: "Query Knowledge Base"
5. Configure:

**Authentication:**
- Auth Type: Header Auth
- Name: Authorization
- Value: `Bearer YOUR_DIRECTUS_TOKEN`

**Request:**
- Method: GET
- URL: `https://your-directus.app/items/knowledge_base`

**Query Parameters:**
Add these parameters:
- `filter[client_id][_eq]` = `{{$node["Extract Client ID"].json.clientId}}`
- `filter[status][_eq]` = `ready`
- `search` = `{{$node["Extract Client ID"].json.message}}`
- `limit` = `5`
- `sort` = `-created_at`

6. Click "Execute Node" to test

---

#### Step 5: Get System Prompts

1. Add another "HTTP Request" node
2. Name it: "Get System Prompts"
3. Configure similar to step 4:

**Request:**
- Method: GET
- URL: `https://your-directus.app/items/system_prompts`

**Query Parameters:**
- `filter[client_id][_eq]` = `{{$node["Extract Client ID"].json.clientId}}`
- `filter[is_active][_eq]` = `true`
- `limit` = `1`

---

#### Step 6: Build LLM Context

1. Add "Code" node
2. Name it: "Build LLM Context"
3. Add this code:

```javascript
const message = $node["Extract Client ID"].json.message;
const knowledgeBase = $node["Query Knowledge Base"].json.data || [];
const systemPrompts = $node["Get System Prompts"].json.data || [];

// Get system prompt
const systemPrompt = systemPrompts.length > 0 
  ? systemPrompts[0].prompt_text 
  : "You are a helpful conference assistant. Answer questions based on the provided knowledge base.";

// Build context from knowledge base
let context = "";
if (knowledgeBase.length > 0) {
  context = "Knowledge Base:\n\n";
  knowledgeBase.forEach((doc, index) => {
    context += `Document ${index + 1}: ${doc.document_name}\n`;
    context += `${doc.document_content.substring(0, 1000)}...\n\n`;
  });
}

// Build messages array for LLM
const messages = [
  {
    role: "system",
    content: systemPrompt + "\n\n" + context
  },
  {
    role: "user",
    content: message
  }
];

return {
  messages,
  knowledgeBase,
  systemPrompt
};
```

---

#### Step 7: Call OpenAI (or other LLM)

1. Add "OpenAI" node (or "HTTP Request" for other providers)
2. Name it: "Generate Response"

**For OpenAI:**
- Resource: Chat
- Model: gpt-4 (or gpt-3.5-turbo for faster/cheaper)
- Messages: `{{$node["Build LLM Context"].json.messages}}`
- Temperature: 0.7
- Max Tokens: 500

**Authentication:**
- Add OpenAI credentials in n8n
- API Key: Your OpenAI API key

**For Anthropic Claude:**
Use HTTP Request node:
```
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: YOUR_ANTHROPIC_KEY
  anthropic-version: 2023-06-01
  content-type: application/json
Body:
{
  "model": "claude-3-sonnet-20240229",
  "max_tokens": 1024,
  "messages": {{$node["Build LLM Context"].json.messages}}
}
```

---

#### Step 8: Format Response

1. Add "Code" node
2. Name it: "Format Response"
3. Add this code:

```javascript
const aiResponse = $node["Generate Response"].json.choices[0].message.content;
const knowledgeBase = $node["Build LLM Context"].json.knowledgeBase;
const sessionId = $node["Extract Client ID"].json.sessionId;

// Build sources array
const sources = knowledgeBase.slice(0, 3).map(doc => ({
  title: doc.document_name,
  url: doc.document_url || null,
  excerpt: doc.document_content.substring(0, 200) + "..."
}));

return {
  response: aiResponse,
  sessionId: sessionId,
  sources: sources.length > 0 ? sources : undefined
};
```

---

#### Step 9: Send Response

1. Add "Respond to Webhook" node
2. Connect it after "Format Response"
3. Configure:
   - Response Code: 200
   - Response Data: `{{$node["Format Response"].json}}`

---

#### Step 10: Add Error Handling

1. Click on the workflow settings (gear icon)
2. Go to "Error Workflow"
3. Create error response:

Add a "Respond to Webhook" node to error path:
- Response Code: 500
- Response Data:
```json
{
  "error": "Internal server error",
  "message": "Failed to process chat request"
}
```

---

#### Step 11: Test the Workflow

1. Click "Execute Workflow"
2. Send a test request using curl:

```bash
curl -X POST https://your-n8n.app/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-client-uuid",
    "message": "What time does the conference start?",
    "sessionId": "test-session-uuid",
    "metadata": {
      "userAgent": "Test",
      "pageUrl": "http://test.com"
    }
  }'
```

3. Check the response
4. Debug any errors in n8n execution log

---

#### Step 12: Activate Workflow

1. Toggle the "Active" switch in top right
2. Workflow is now live and ready to receive requests!

---

## Part 4: Application Configuration

Now connect everything to your application.

### Update Environment Variables

Create/update `.env` file:

```bash
# ============================================================================
# DATABASE
# ============================================================================
DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require
SESSION_DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require

# ============================================================================
# SESSION
# ============================================================================
SESSION_SECRET=your-super-secret-random-string-min-32-chars

# ============================================================================
# N8N INTEGRATION
# ============================================================================
N8N_WEBHOOK_URL=https://your-n8n.app/webhook/chat
N8N_WEBHOOK_SECRET=optional-shared-secret-for-validation

# ============================================================================
# DIRECTUS INTEGRATION
# ============================================================================
DIRECTUS_URL=https://your-directus.app
DIRECTUS_TOKEN=wSfvZ7TyGzN7jLKsDJYQz8mKGvF2E3Km

# ============================================================================
# LLM PROVIDER (for reference, used in n8n)
# ============================================================================
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# ============================================================================
# APPLICATION
# ============================================================================
NODE_ENV=production
PORT=5000
```

### Generate Secure Session Secret

```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Part 5: Update Session Store

Currently using MemoryStore (not production-ready). Update to PostgreSQL session store.

### Install connect-pg-simple

Already in package.json, but verify:

```bash
npm list connect-pg-simple
```

### Update server/index.ts

Find the session configuration and update:

```typescript
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

const PgStore = connectPgSimple(session);
const pgPool = new pg.Pool({
  connectionString: process.env.SESSION_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

app.use(
  session({
    store: new PgStore({
      pool: pgPool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  })
);
```

---

## Part 6: Client Onboarding Process

When a new user signs up, you need to create their client and widget configuration.

### Update server/routes/auth-routes.ts

Add client creation to registration:

```typescript
router.post("/register", async (req, res) => {
  // ... existing validation ...
  
  // Create user
  const user = await storage.createUser({
    username,
    password: hashedPassword,
  });

  // Create client for user
  const client = await storage.createClient({
    userId: user.id,
    name: `${username}'s Conference`,
    publicApiKey: `pk_live_${randomBytes(32).toString('hex')}`,
    allowedDomains: [],
    status: "active",
  });

  // Create default widget configuration
  await storage.createClientWidget({
    clientId: client.id,
    primaryColor: "#3b82f6",
    position: "bottom-right",
    welcomeMessage: "Hi! How can I help you today?",
    widgetName: "Support",
  });

  // ... existing response ...
});
```

---

## Part 7: Testing the Complete Integration

### Test 1: Database Connection

```bash
# Start your server
npm run dev

# Check logs for database connection
# Should see: "Database connected" or similar
```

### Test 2: Widget Configuration

1. Log into your dashboard
2. Go to Widget Configuration
3. Change the primary color
4. Click Save
5. Check Directus/PostgreSQL to verify data was saved

### Test 3: Widget Loading

1. Get your API key from Settings page
2. Open `public/widget-test.html`
3. Replace `YOUR_API_KEY_HERE` with your actual key
4. Open in browser
5. Widget should load with your configured colors

### Test 4: Chat Flow (End-to-End)

1. In Directus, manually add a test document:
   - client_id: (your client ID from dashboard)
   - document_name: "Test Conference Info"
   - document_content: "The conference starts at 9 AM on Monday."
   - document_type: "txt"
   - status: "ready"

2. Open widget test page
3. Click chat button
4. Type: "What time does the conference start?"
5. Send message

**Expected flow:**
- Message sent to `/api/widget/chat`
- Forwarded to n8n webhook
- n8n queries Directus (finds your document)
- n8n calls OpenAI/Claude
- Response returned: "The conference starts at 9 AM on Monday."

### Test 5: Multi-Tenant Isolation

1. Create second user account
2. Add document for second user's client
3. Try to access first user's documents from second user's widget
4. Should NOT be able to see other client's data

---

## Part 8: Monitoring & Debugging

### Enable Logging

Install Winston:

```bash
npm install winston
```

Create `server/logger.ts`:

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

Use in routes:

```typescript
import { logger } from './logger';

logger.info('Chat request received', { clientId, message });
logger.error('n8n webhook failed', { error });
```

### Monitor n8n Executions

1. In n8n dashboard, click "Executions"
2. View all workflow runs
3. Click on any execution to see detailed logs
4. Check for errors or slow steps

### Monitor Directus

1. In Directus admin, go to "Insights"
2. View API request logs
3. Monitor query performance
4. Check error rates

---

## Part 9: Environment Variables Reference

Complete `.env` file template:

```bash
# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

# Primary database connection
# Format: postgresql://user:password@host:port/database?sslmode=require
DATABASE_URL=

# Session store database (can be same as DATABASE_URL)
SESSION_DATABASE_URL=

# ============================================================================
# SESSION CONFIGURATION
# ============================================================================

# Secret for signing session cookies (min 32 characters)
SESSION_SECRET=

# ============================================================================
# N8N WEBHOOK CONFIGURATION
# ============================================================================

# Your n8n webhook URL for chat processing
N8N_WEBHOOK_URL=

# Optional: Shared secret for webhook validation
N8N_WEBHOOK_SECRET=

# ============================================================================
# DIRECTUS CONFIGURATION
# ============================================================================

# Directus API URL (no trailing slash)
DIRECTUS_URL=

# Directus API access token
DIRECTUS_TOKEN=

# ============================================================================
# APPLICATION CONFIGURATION
# ============================================================================

# Environment: development | production
NODE_ENV=production

# Server port
PORT=5000

# CORS origins (comma-separated)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# ============================================================================
# OPTIONAL: RATE LIMITING
# ============================================================================

# Rate limit window in milliseconds (default: 60000 = 1 minute)
RATE_LIMIT_WINDOW_MS=60000

# Max requests per window (default: 100)
RATE_LIMIT_MAX_REQUESTS=100

# ============================================================================
# OPTIONAL: EXTERNAL SERVICES (for reference, used in n8n)
# ============================================================================

# OpenAI API Key (used in n8n workflow)
# OPENAI_API_KEY=sk-...

# Anthropic API Key (alternative to OpenAI)
# ANTHROPIC_API_KEY=sk-ant-...
```

---

## Part 10: Production Deployment

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrated and tested
- [ ] Directus collections created
- [ ] n8n workflow active
- [ ] Session store using PostgreSQL
- [ ] HTTPS/SSL configured
- [ ] CORS configured for production domains
- [ ] API keys secured (not in code)
- [ ] Logs enabled
- [ ] Error tracking set up (Sentry recommended)

### Deployment Steps

1. **Build application:**
```bash
npm run build
```

2. **Test production build locally:**
```bash
NODE_ENV=production npm start
```

3. **Deploy to hosting platform:**
   - Railway: Connect GitHub repo, auto-deploys
   - Render: Connect GitHub repo, auto-deploys
   - Heroku: `git push heroku main`
   - Vercel: `vercel deploy`

4. **Verify deployment:**
```bash
# Health check
curl https://your-app.com/api/widget/health

# Expected: {"status":"ok","timestamp":"..."}
```

5. **Update widget code on client websites
