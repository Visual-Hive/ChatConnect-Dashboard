# Chat Connect Dashboard - Cline Implementation Plan

**Current Status:** 75% Complete (Core architecture and frontend done, backend integration needed)  
**Target:** Production-ready multi-tenant SaaS platform  
**Estimated Time to Completion:** 2-3 weeks  

---

## Table of Contents

1. [Current State](#current-state)
2. [Phase 1: Database Integration (Week 1)](#phase-1-database-integration-week-1)
3. [Phase 2: Knowledge Base & File Upload (Week 1-2)](#phase-2-knowledge-base--file-upload-week-1-2)
4. [Phase 3: AI Integration (Week 2)](#phase-3-ai-integration-week-2)
5. [Phase 4: Testing & Optimization (Week 2-3)](#phase-4-testing--optimization-week-2-3)
6. [Phase 5: Production Readiness (Week 3)](#phase-5-production-readiness-week-3)
7. [Review Checkpoint Guidelines](#review-checkpoint-guidelines)

---

## Current State

### ✅ Completed (75%)

**Frontend Dashboard:**
- ✅ React application with TypeScript
- ✅ Multi-page navigation (Dashboard, Widget Config, Knowledge Base, Settings)
- ✅ Widget configuration UI (appearance, prompts, domains)
- ✅ API key management UI
- ✅ Domain restriction UI
- ✅ Responsive design with Tailwind CSS

**Widget:**
- ✅ Embeddable chat widget (vanilla JavaScript)
- ✅ Customizable appearance
- ✅ API key authentication
- ✅ Domain restriction enforcement
- ✅ Chat UI with typing indicators
- ✅ Cross-browser compatible

**Backend API:**
- ✅ Express server with TypeScript
- ✅ Widget API endpoints (/api/widget/*)
- ✅ Dashboard API endpoints (/api/dashboard/*)
- ✅ JWT authentication for dashboard
- ✅ API key authentication for widget
- ✅ CORS with dynamic domain validation
- ✅ In-memory storage (temporary)

**Documentation:**
- ✅ Architecture documentation
- ✅ Development guide
- ✅ Deployment guide
- ✅ Implementation audit
- ✅ Multi-tenant schema plan

### ⚠️ In Progress (20%)

**Backend Integration:**
- ⚠️ PostgreSQL connection (schema defined, not connected)
- ⚠️ Drizzle ORM setup (configured, needs testing)
- ⚠️ n8n webhook integration (API structure ready, workflow not built)

### ❌ Not Started (5%)

**Core Features:**
- ❌ File upload and processing
- ❌ Directus integration
- ❌ LLM/AI integration
- ❌ Vector embeddings
- ❌ Knowledge base search
- ❌ Rate limiting
- ❌ Comprehensive error logging
- ❌ Test suite
- ❌ Production deployment setup

---

## Phase 1: Database Integration (Week 1)

**Objective:** Replace in-memory storage with PostgreSQL and ensure multi-tenant data isolation works correctly.

### Task 1.1: PostgreSQL Connection Setup
**Duration:** 2-4 hours  
**Confidence Target:** 9/10  

**Activities:**
1. ✅ Review `shared/schema.ts` - Drizzle schema definition
2. ⚠️ Set up local PostgreSQL database
3. ⚠️ Configure environment variables (`.env`)
4. ⚠️ Test database connection
5. ⚠️ Run `npm run db:push` to create tables
6. ⚠️ Verify schema with Drizzle Studio

**Deliverables:**
- Working PostgreSQL connection
- All tables created and indexed
- Environment variables documented

**🛑 CHECKPOINT 1.1:** Test database connection and verify all tables exist with proper indexes.

**Review Questions for Thong:**
- ✅ Database connection successful?
- ✅ All tables created correctly?
- ✅ Indexes in place for `clientId` and `apiKey`?
- ✅ Ready to migrate data operations?

---

### Task 1.2: Migrate Data Operations to Database
**Duration:** 4-6 hours  
**Confidence Target:** 8/10  

**Activities:**
1. ⚠️ Replace in-memory widget config storage with database queries
2. ⚠️ Replace in-memory client storage with database queries
3. ⚠️ Update all API endpoints to use database
4. ⚠️ Implement proper error handling for database operations
5. ⚠️ Add logging for database errors
6. ⚠️ Test all CRUD operations

**Files to Modify:**
- `server/src/routes/widget.ts` - Widget API routes
- `server/src/routes/dashboard.ts` - Dashboard API routes
- `server/src/lib/storage.ts` - Remove in-memory storage

**Critical:** Every query must filter by `clientId` for multi-tenant isolation.

**Example Migration:**
```typescript
// BEFORE (in-memory)
const widget = widgetConfigs.get(widgetId);

// AFTER (database with multi-tenant filtering)
const widget = await db.query.widgetConfig.findFirst({
  where: and(
    eq(widgetConfig.clientId, clientId),
    eq(widgetConfig.id, widgetId)
  )
});
```

**Testing Checklist:**
- [ ] Create widget config via dashboard → Saved to database
- [ ] Update widget config → Database updated
- [ ] Delete widget config → Soft delete in database
- [ ] Load widget config in widget → Retrieved from database
- [ ] API key validation → Query database
- [ ] Domain restriction validation → Query database
- [ ] Multi-tenant isolation → Client A cannot access Client B's data

**🛑 CHECKPOINT 1.2:** All API endpoints use database, multi-tenant isolation verified.

**Review Questions for Thong:**
- ✅ All in-memory storage removed?
- ✅ All queries filter by `clientId`?
- ✅ Multi-tenant isolation tested and working?
- ✅ Error handling comprehensive?
- ✅ No data leakage between clients?

---

### Task 1.3: Add Database Migrations
**Duration:** 1-2 hours  
**Confidence Target:** 9/10  

**Activities:**
1. ⚠️ Generate initial migration with `npx drizzle-kit generate:pg`
2. ⚠️ Review generated migration SQL
3. ⚠️ Test migration on fresh database
4. ⚠️ Document migration process
5. ⚠️ Add migration commands to package.json

**Deliverables:**
- Initial migration file
- Migration documentation
- Test on clean database

**🛑 CHECKPOINT 1.3:** Migrations work on clean database, documented.

---

## Phase 2: Knowledge Base & File Upload (Week 1-2)

**Objective:** Enable users to upload documents and store them in Directus CMS with proper multi-tenant isolation.

### Task 2.1: Directus Setup
**Duration:** 3-4 hours  
**Confidence Target:** 7/10  

**Activities:**
1. ⚠️ Set up Directus instance (Docker or Cloud)
2. ⚠️ Create collections for knowledge base:
   - `documents` (stores file metadata and content)
   - `tags` (for categorization)
   - `document_tags` (many-to-many relationship)
3. ⚠️ Configure API access
4. ⚠️ Set up authentication between backend and Directus
5. ⚠️ Test CRUD operations with `clientId` filtering

**Directus Collections Schema:**

**documents:**
```javascript
{
  id: UUID (primary key),
  client_id: String (indexed, required),
  title: String,
  content: Text (extracted text),
  file_url: String,
  file_type: String (pdf, docx, txt),
  file_size: Number,
  status: String (processing, ready, failed),
  created_at: DateTime,
  updated_at: DateTime
}
```

**tags:**
```javascript
{
  id: UUID (primary key),
  client_id: String (indexed, required),
  name: String,
  prompt: Text (associated AI prompt),
  created_at: DateTime
}
```

**🛑 CHECKPOINT 2.1:** Directus setup complete, collections created, API access working.

**Review Questions for Thong:**
- ✅ Directus instance accessible?
- ✅ Collections created with proper schema?
- ✅ Can query documents filtered by `client_id`?
- ✅ Authentication working?
- ❓ Do we want to use Directus Cloud or self-hosted?

---

### Task 2.2: File Upload Implementation
**Duration:** 4-6 hours  
**Confidence Target:** 7/10  

**Activities:**
1. ⚠️ Create upload endpoint: `POST /api/dashboard/knowledge-base/upload`
2. ⚠️ Handle multipart form data (using `multer`)
3. ⚠️ Validate file type (PDF, DOCX, TXT only)
4. ⚠️ Validate file size (<5MB)
5. ⚠️ Upload file to Directus storage
6. ⚠️ Extract text content from file:
   - PDF: Use `pdf-parse` library
   - DOCX: Use `mammoth` library
   - TXT: Read directly
7. ⚠️ Store document metadata in Directus
8. ⚠️ Return upload status and document ID

**API Endpoint Design:**
```typescript
POST /api/dashboard/knowledge-base/upload
Headers:
  Authorization: Bearer <jwt-token>
  Content-Type: multipart/form-data

Body:
  file: File (required)
  tags: string[] (optional)

Response:
{
  success: true,
  data: {
    id: "uuid",
    title: "document.pdf",
    status: "processing",
    fileUrl: "https://directus/files/xyz.pdf"
  }
}
```

**Error Handling:**
- 400: Invalid file type
- 413: File too large
- 500: Processing error

**🛑 CHECKPOINT 2.2:** File upload working, documents stored in Directus.

**Review Questions for Thong:**
- ✅ Files upload successfully?
- ✅ Text extraction working for all supported formats?
- ✅ Documents stored with correct `client_id`?
- ✅ Error handling comprehensive?
- ❓ Should we process files asynchronously?
- ❓ Do we need progress indicators for large files?

---

### Task 2.3: Knowledge Base UI
**Duration:** 3-4 hours  
**Confidence Target:** 8/10  

**Activities:**
1. ⚠️ Update Knowledge Base page with upload functionality
2. ⚠️ Add file upload component with drag-and-drop
3. ⚠️ Add document list with search and filtering
4. ⚠️ Add tag management UI
5. ⚠️ Add document preview/delete functionality
6. ⚠️ Show processing status for uploaded files

**Components:**
- `FileUploadZone` - Drag-and-drop upload area
- `DocumentList` - Table of uploaded documents
- `DocumentRow` - Individual document with actions
- `TagManager` - Create/edit tags and associated prompts

**🛑 CHECKPOINT 2.3:** Knowledge Base UI complete, users can upload and manage documents.

---

## Phase 3: AI Integration (Week 2)

**Objective:** Connect chat widget to AI/LLM via n8n workflows with knowledge base context.

### Task 3.1: n8n Workflow Creation
**Duration:** 4-6 hours  
**Confidence Target:** 6/10 (requires n8n expertise)  

**Activities:**
1. ⚠️ Set up n8n instance (Docker or Cloud)
2. ⚠️ Create workflow: "Chat with Knowledge Base"
3. ⚠️ Configure webhook trigger (receives chat messages)
4. ⚠️ Add Directus node to query relevant documents
5. ⚠️ Add LLM node (OpenAI or Anthropic)
6. ⚠️ Configure prompt with context from documents
7. ⚠️ Return formatted response
8. ⚠️ Test workflow end-to-end

**n8n Workflow Design:**
```
Webhook (POST) 
  ↓
Extract message + clientId
  ↓
Query Directus (filter by clientId)
  ↓
Build context from documents
  ↓
LLM API (OpenAI/Anthropic)
  ↓
Format response
  ↓
Return JSON response
```

**Webhook Payload:**
```json
{
  "clientId": "uuid",
  "message": "User question",
  "conversationId": "uuid",
  "metadata": {
    "tags": ["support", "billing"]
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "response": "AI generated response",
  "sources": [
    {
      "documentId": "uuid",
      "title": "Document title",
      "excerpt": "Relevant excerpt..."
    }
  ]
}
```

**🛑 CHECKPOINT 3.1:** n8n workflow working, responds to webhook with AI-generated answers.

**Review Questions for Thong:**
- ✅ n8n instance set up and accessible?
- ✅ Workflow receives webhook calls?
- ✅ Documents queried correctly by `client_id`?
- ✅ LLM responds with quality answers?
- ❓ Which LLM should we use (OpenAI GPT-4, Anthropic Claude)?
- ❓ Do we need to implement conversation history?
- ❓ Should we add RAG (vector embeddings) for better context retrieval?

---

### Task 3.2: Connect Widget to n8n
**Duration:** 2-3 hours  
**Confidence Target:** 8/10  

**Activities:**
1. ⚠️ Update `POST /api/widget/chat` to call n8n webhook
2. ⚠️ Pass message and clientId to webhook
3. ⚠️ Handle n8n response and return to widget
4. ⚠️ Add error handling for n8n failures
5. ⚠️ Add timeout handling (max 30s)
6. ⚠️ Add loading states in widget UI

**API Flow:**
```
Widget → POST /api/widget/chat
  ↓
Validate API key + domain
  ↓
Call n8n webhook
  ↓
Wait for n8n response (max 30s)
  ↓
Return response to widget
```

**Error Handling:**
- n8n timeout: "Sorry, I'm taking too long to respond. Please try again."
- n8n error: "I'm having trouble processing your request right now."
- No knowledge base: "I don't have enough information to answer that question."

**🛑 CHECKPOINT 3.2:** Widget chat connected to AI, responses flowing through system.

**Review Questions for Thong:**
- ✅ Widget successfully sends messages to API?
- ✅ API calls n8n webhook correctly?
- ✅ Responses display in widget?
- ✅ Error handling works for all failure scenarios?
- ✅ Response time acceptable (<5s)?

---

### Task 3.3: Conversation History
**Duration:** 3-4 hours  
**Confidence Target:** 7/10  

**Activities:**
1. ⚠️ Add `conversations` table to database
2. ⚠️ Add `messages` table to database
3. ⚠️ Store messages and responses
4. ⚠️ Pass conversation history to n8n
5. ⚠️ Update n8n workflow to use history
6. ⚠️ Add conversation history to dashboard UI

**Database Schema:**

**conversations:**
```typescript
{
  id: UUID,
  clientId: String (indexed),
  widgetSessionId: String,
  startedAt: DateTime,
  lastMessageAt: DateTime,
  status: 'active' | 'closed'
}
```

**messages:**
```typescript
{
  id: UUID,
  conversationId: UUID (foreign key),
  role: 'user' | 'assistant',
  content: Text,
  createdAt: DateTime
}
```

**🛑 CHECKPOINT 3.3:** Conversation history stored and used in AI responses.

---

## Phase 4: Testing & Optimization (Week 2-3)

**Objective:** Ensure system is robust, secure, and performant.

### Task 4.1: Comprehensive Testing
**Duration:** 4-6 hours  
**Confidence Target:** 8/10  

**Activities:**
1. ⚠️ Write unit tests for core logic
2. ⚠️ Write integration tests for API endpoints
3. ⚠️ Write E2E tests for critical flows
4. ⚠️ Test multi-tenant isolation thoroughly
5. ⚠️ Test error scenarios
6. ⚠️ Test browser compatibility (Chrome, Firefox, Safari, Edge)

**Test Coverage Targets:**
- Unit tests: 70%+
- Integration tests: All API endpoints
- E2E tests: Widget embedding, chat flow, configuration

**Critical Tests:**
```typescript
describe('Multi-tenant Isolation', () => {
  it('prevents client A from accessing client B data', async () => {
    // Create data for two different clients
    // Verify Client A cannot query Client B's data
  });
  
  it('enforces clientId in all database queries', async () => {
    // Audit all queries to ensure clientId filter
  });
});

describe('Widget Security', () => {
  it('validates API keys on all widget endpoints', async () => {
    // Test without API key → 401
    // Test with invalid API key → 401
    // Test with valid API key → 200
  });
  
  it('enforces domain restrictions', async () => {
    // Test from unauthorized domain → 403
    // Test from authorized domain → 200
  });
});

describe('Knowledge Base', () => {
  it('only retrieves documents for requesting client', async () => {
    // Upload doc for Client A
    // Query as Client B
    // Verify Client B cannot access Client A's doc
  });
});
```

**🛑 CHECKPOINT 4.1:** Test suite passing, multi-tenant isolation verified.

**Review Questions for Thong:**
- ✅ All tests passing?
- ✅ Test coverage meets targets?
- ✅ Multi-tenant isolation verified?
- ✅ Security tests comprehensive?
- ✅ Browser compatibility confirmed?

---

### Task 4.2: Performance Optimization
**Duration:** 3-4 hours  
**Confidence Target:** 7/10  

**Activities:**
1. ⚠️ Add database indexes for frequently queried columns
2. ⚠️ Optimize database queries (use EXPLAIN)
3. ⚠️ Add Redis caching for widget configs
4. ⚠️ Minimize widget bundle size
5. ⚠️ Implement query result pagination
6. ⚠️ Add response time monitoring

**Performance Targets:**
- Widget load time: <500ms
- Chat response time: <3s
- Dashboard load time: <1s
- API response time: <200ms

**Optimizations:**
```typescript
// Add indexes
CREATE INDEX idx_widget_config_client_id ON widget_config(client_id);
CREATE INDEX idx_widget_config_api_key ON widget_config(api_key);
CREATE INDEX idx_documents_client_id ON documents(client_id);

// Add caching
const cachedConfig = await redis.get(`widget:${apiKey}`);
if (cachedConfig) return JSON.parse(cachedConfig);

// Cache for 5 minutes
await redis.setex(`widget:${apiKey}`, 300, JSON.stringify(config));
```

**🛑 CHECKPOINT 4.2:** Performance targets met, system responsive.

---

### Task 4.3: Error Logging & Monitoring
**Duration:** 2-3 hours  
**Confidence Target:** 8/10  

**Activities:**
1. ⚠️ Add Winston logger for structured logging
2. ⚠️ Log all errors with context
3. ⚠️ Add Sentry for error tracking (optional)
4. ⚠️ Set up health check endpoint
5. ⚠️ Add performance monitoring
6. ⚠️ Create logging documentation

**Logging Structure:**
```typescript
logger.error('Failed to process chat message', {
  clientId,
  error: error.message,
  stack: error.stack,
  request: { message, conversationId }
});
```

**🛑 CHECKPOINT 4.3:** Logging comprehensive, errors tracked.

---

## Phase 5: Production Readiness (Week 3)

**Objective:** Prepare system for production deployment.

### Task 5.1: Rate Limiting & Security Hardening
**Duration:** 2-3 hours  
**Confidence Target:** 9/10  

**Activities:**
1. ⚠️ Add rate limiting to widget endpoints (100 req/hour per API key)
2. ⚠️ Add rate limiting to dashboard endpoints (1000 req/hour per user)
3. ⚠️ Implement request throttling
4. ⚠️ Add security headers (helmet.js)
5. ⚠️ Implement CSRF protection
6. ⚠️ Add input sanitization

**Rate Limiting Example:**
```typescript
import rateLimit from 'express-rate-limit';

const widgetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  keyGenerator: (req) => req.auth.apiKey,
  message: { 
    success: false, 
    error: { 
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests'
    }
  }
});

router.post('/api/widget/chat', widgetLimiter, handleChat);
```

**🛑 CHECKPOINT 5.1:** Rate limiting working, security hardened.

---

### Task 5.2: Production Deployment Setup
**Duration:** 3-4 hours  
**Confidence Target:** 8/10  

**Activities:**
1. ⚠️ Create production Docker Compose file
2. ⚠️ Set up environment variable management
3. ⚠️ Configure PostgreSQL for production
4. ⚠️ Set up SSL/TLS certificates
5. ⚠️ Configure reverse proxy (nginx)
6. ⚠️ Set up automated backups
7. ⚠️ Create deployment documentation

**Production Checklist:**
- [ ] Environment variables secured
- [ ] Database backups configured
- [ ] SSL certificates installed
- [ ] Logs rotated and stored
- [ ] Health checks configured
- [ ] Monitoring enabled
- [ ] Rollback plan documented

**🛑 CHECKPOINT 5.2:** Production environment ready, deployment tested.

**Review Questions for Thong:**
- ✅ Production environment configured?
- ✅ SSL certificates working?
- ✅ Database backups automated?
- ✅ Deployment documentation complete?
- ✅ Ready for first production deployment?

---

### Task 5.3: Final Testing & Documentation
**Duration:** 2-3 hours  
**Confidence Target:** 9/10  

**Activities:**
1. ⚠️ Run full test suite
2. ⚠️ Perform manual end-to-end testing
3. ⚠️ Review all documentation
4. ⚠️ Update README with deployment instructions
5. ⚠️ Create user guide for dashboard
6. ⚠️ Create integration guide for widget

**Final Testing Checklist:**
- [ ] All automated tests passing
- [ ] Widget embeds and works on test sites
- [ ] Chat responses are accurate and contextual
- [ ] Dashboard configuration updates widget in real-time
- [ ] API key regeneration works
- [ ] Domain restrictions enforced
- [ ] Multi-tenant isolation verified
- [ ] File upload and processing works
- [ ] Knowledge base search returns relevant results
- [ ] Performance meets targets
- [ ] Error handling graceful

**🛑 FINAL CHECKPOINT:** System production-ready!

**Final Review with Thong:**
- ✅ All features working as expected?
- ✅ All tests passing?
- ✅ Documentation complete?
- ✅ Production environment ready?
- ✅ Team trained on deployment process?
- ✅ Go/No-Go decision for launch?

---

## Review Checkpoint Guidelines

### When to Stop for Review

**Mandatory Review Points:**
1. After completing each phase
2. Before database schema changes
3. After implementing security features
4. Before production deployment
5. When confidence rating <8
6. When encountering unexpected issues

### How to Request Review

**Format:**
```
🛑 CHECKPOINT [Phase.Task]: [Brief Description]

**What was completed:**
- [List completed items]

**Changes made:**
- [Files modified]
- [New features added]

**Testing done:**
- [Tests run and results]

**Confidence:** [X/10]

**Reason for confidence rating:**
[Explain why this rating]

**Questions/Concerns:**
1. [Question or concern]
2. [Question or concern]

**Ready for:**
- [ ] Code review
- [ ] Testing by Thong
- [ ] Proceed to next task
```

### Review Checklist for Thong

**For each checkpoint:**
- [ ] Review code changes
- [ ] Test functionality manually
- [ ] Verify multi-tenant isolation
- [ ] Check security implications
- [ ] Confirm tests are passing
- [ ] Review documentation updates
- [ ] Approve or request changes
- [ ] Give go-ahead for next phase

---

## Success Criteria

### Phase 1 Complete When:
- ✅ PostgreSQL connected and working
- ✅ All API endpoints use database
- ✅ Multi-tenant isolation verified
- ✅ Migrations documented

### Phase 2 Complete When:
- ✅ Directus integrated
- ✅ File upload working
- ✅ Documents stored and searchable
- ✅ UI complete and functional

### Phase 3 Complete When:
- ✅ n8n workflows created
- ✅ AI responding to chat messages
- ✅ Knowledge base context included in responses
- ✅ Conversation history working

### Phase 4 Complete When:
- ✅ Test coverage >70%
- ✅ All tests passing
- ✅ Performance targets met
- ✅ Logging comprehensive

### Phase 5 Complete When:
- ✅ Rate limiting implemented
- ✅ Production environment configured
- ✅ All documentation complete
- ✅ Final testing passed

---

## Risk Management

### High Risk Items
1. **Multi-tenant isolation** - Critical for security
   - Mitigation: Thorough testing, code reviews, audit all queries
2. **n8n workflow complexity** - May be difficult to debug
   - Mitigation: Start simple, add complexity gradually, document thoroughly
3. **File processing errors** - Corrupted files, extraction failures
   - Mitigation: Robust error handling, validate files, async processing
4. **Performance under load** - May not scale well initially
   - Mitigation: Performance testing, optimization, caching, monitoring

### Medium Risk Items
1. **LLM API failures** - External dependency
   - Mitigation: Timeout handling, retry logic, fallback responses
2. **Database connection issues** - Connection pool exhaustion
   - Mitigation: Connection pooling, monitoring, alerts
3. **Browser compatibility** - Widget may not work everywhere
   - Mitigation: Cross-browser testing, polyfills, graceful degradation

---

## Communication Protocol

### Daily Updates
Provide brief update at end of each work session:
- What was accomplished
- Current confidence level
- Any blockers or questions
- Next steps

### When Stuck (>30 min)
Stop and ask for help:
- Describe the problem
- What was tried
- Confidence level
- Specific questions

### Before Major Changes
Get approval before:
- Changing database schema
- Modifying security logic
- Changing API contracts
- Refactoring large sections

---

## Estimated Timeline

**Week 1:**
- Days 1-2: Phase 1 (Database Integration)
- Days 3-4: Phase 2 Task 2.1-2.2 (Directus + File Upload)
- Day 5: Phase 2 Task 2.3 (Knowledge Base UI)

**Week 2:**
- Days 1-2: Phase 3 (AI Integration)
- Days 3-4: Phase 4 Task 4.1-4.2 (Testing + Performance)
- Day 5: Phase 4 Task 4.3 (Logging)

**Week 3:**
- Days 1-2: Phase 5 Task 5.1-5.2 (Security + Deployment)
- Day 3: Phase 5 Task 5.3 (Final Testing)
- Days 4-5: Buffer for issues and final polish

**Total:** 15 working days (3 weeks)

---

**Remember:** This is a plan, not a contract. Adjust as needed based on what we discover during implementation. Quality and security over speed.