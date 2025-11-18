# Chat Connect Dashboard - Custom Instructions for Cline

**Paste these instructions into Cline's Custom Instructions field (VSCode Extension Settings)**

---

## Core Behavior

You are developing Chat Connect Dashboard, a multi-tenant SaaS platform for AI-powered chat widgets. Always follow these principles:

### 1. Analysis Before Action

**BEFORE writing ANY code:**
- Read relevant documentation (`docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`)
- Analyze existing code patterns thoroughly
- State your understanding of the requirement
- Outline your implementation approach
- Identify potential issues or edge cases
- Rate your confidence (1-10)
- If confidence <8, ask questions first

**Example:**
```
Understanding: You want me to add a new API endpoint for uploading documents to the knowledge base.

Approach:
1. Create POST /api/dashboard/knowledge-base/upload endpoint
2. Validate file type (PDF, DOCX, TXT) and size (<5MB)
3. Store file in Directus
4. Extract text and create embeddings
5. Associate with clientId and tags

Potential Issues:
- Need to handle large file uploads efficiently
- Text extraction from PDFs may be slow
- Need to implement proper error handling for failed uploads

Confidence: 7/10 (solid approach but haven't implemented file upload pipeline before)

Questions:
- Should we use streaming for large files?
- Do we want to process files asynchronously?
- What's the expected file size limit?
```

### 2. Never Omit Code

**DO NOT BE LAZY. DO NOT OMIT CODE.**

- Always provide complete implementations
- NEVER use comments like `// ... rest of code` or `// existing code...`
- If a file is long, show it in sections but include ALL code
- Never say "keep the existing code" - show the complete file

**Bad Example (DO NOT DO THIS):**
```typescript
export function WidgetConfig() {
  // ... existing code ...
  
  const handleSave = async () => {
    // Save the config
  };
  
  // ... rest of component ...
}
```

**Good Example (DO THIS):**
```typescript
export function WidgetConfig() {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchConfig();
  }, []);
  
  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/widget/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    try {
      await fetch('/api/widget/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      toast.success('Config saved successfully');
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save config');
    }
  };
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div className="widget-config">
      {/* Full implementation here */}
    </div>
  );
}
```

### 3. Security First - Multi-Tenant Isolation

**CRITICAL:** This is a multi-tenant application. Every database query MUST filter by `clientId`.

**ALWAYS do this:**
```typescript
// ✅ CORRECT - Filters by clientId
const widget = await db.query.widgetConfig.findFirst({
  where: and(
    eq(widgetConfig.clientId, clientId),
    eq(widgetConfig.id, widgetId)
  )
});
```

**NEVER do this:**
```typescript
// ❌ WRONG - Security vulnerability!
const widget = await db.query.widgetConfig.findFirst({
  where: eq(widgetConfig.id, widgetId)
});
```

**Key Security Rules:**
- Validate API keys on all widget endpoints
- Enforce domain restrictions
- Sanitize all user inputs
- Use parameterized queries (never string concatenation)
- Return appropriate error codes without exposing internals

### 4. TypeScript Discipline

- **Strict mode is enabled** - No `any` types
- Use `unknown` when type is uncertain, then narrow with type guards
- Define interfaces for all object shapes
- Provide explicit return types for functions
- Use const assertions and readonly where appropriate

**Example:**
```typescript
// ✅ GOOD
interface WidgetConfig {
  readonly clientId: string;
  apiKey: string;
  appearance: {
    primaryColor: string;
    position: 'bottom-right' | 'bottom-left';
  };
}

async function updateConfig(
  clientId: string,
  config: Partial<WidgetConfig>
): Promise<WidgetConfig> {
  // implementation
}

// ❌ BAD
function updateConfig(clientId, config) {  // Missing types
  // implementation
}
```

### 5. Documentation Standards

**Update documentation when:**
- Adding or modifying API endpoints
- Changing architecture or data models
- Adding new features or components
- Discovering bugs or issues

**Required documentation:**
```typescript
/**
 * Validates API key and retrieves associated client ID.
 * 
 * This function is used on all widget endpoints to ensure requests
 * come from authorized clients. Returns 401 if key is invalid.
 * 
 * @param apiKey - The API key from request headers
 * @returns Client ID associated with the API key
 * @throws {ApiError} If API key is invalid or expired
 * 
 * @example
 * const clientId = await validateApiKey(req.headers['x-api-key']);
 */
async function validateApiKey(apiKey: string): Promise<string> {
  // implementation
}
```

### 6. Testing Requirements

**Write tests for:**
- API endpoints (integration tests)
- Business logic (unit tests)
- Multi-tenant isolation (critical!)
- Error handling paths
- Edge cases and validation

**Example test:**
```typescript
describe('Widget API - Multi-tenant Isolation', () => {
  it('should not allow client A to access client B\'s widgets', async () => {
    const clientAWidget = await createTestWidget({ clientId: 'client-a' });
    const clientBApiKey = generateApiKey('client-b');
    
    const response = await request(app)
      .get(`/api/widget/config/${clientAWidget.id}`)
      .set('X-API-Key', clientBApiKey)
      .expect(404); // Should not find the widget
  });
});
```

### 7. Confidence Rating System

**Rate your confidence before significant changes:**

- **9-10**: Proceed with implementation
- **7-8**: Proceed but flag for review
- **5-6**: Ask clarifying questions first
- **1-4**: Stop and request human guidance

**Example:**
```
"I'm going to implement file upload for the knowledge base.
Confidence: 6/10

Reason: I understand the basic flow but I'm uncertain about:
- Best practices for handling multipart form data in Express
- Whether we should process files synchronously or async
- Error handling for corrupted files

Should I proceed with a basic implementation or would you like
to provide guidance on these specific points?"
```

### 8. Git Commit Standards

**Format:** `type(scope): description`

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructuring
- `docs` - Documentation
- `test` - Tests
- `chore` - Maintenance

**Examples:**
```bash
git commit -m "feat(widget): add customizable chat bubble colors"
git commit -m "fix(api): enforce multi-tenant isolation in config endpoint"
git commit -m "refactor(db): optimize queries with proper indexes"
git commit -m "docs(api): update widget API reference with new endpoints"
```

### 9. Error Handling Pattern

**Consistent error responses:**
```typescript
// Success
return res.json({
  success: true,
  data: widget
});

// Error
return res.status(400).json({
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid widget configuration',
    details: validationErrors
  }
});
```

**Error categories:**
- 400: Validation/bad request
- 401: Authentication failure
- 403: Authorization failure
- 404: Resource not found
- 500: Server error

### 10. Performance Awareness

**Consider performance for:**
- Database queries - Use indexes, limit results
- API responses - Return only needed data
- Widget bundle - Keep size minimal
- File uploads - Stream large files

**Example optimization:**
```typescript
// ✅ GOOD - Only fetch needed columns
const widget = await db.query.widgetConfig.findFirst({
  where: eq(widgetConfig.id, id),
  columns: {
    id: true,
    appearance: true,
    // Only columns we need
  }
});

// ❌ BAD - Fetches all columns including large JSON fields
const widget = await db.query.widgetConfig.findFirst({
  where: eq(widgetConfig.id, id)
});
```

---

## Working with Thong

### Communication Style
- Be explicit about what you're doing and why
- Provide context for decisions
- Ask questions when uncertain
- Flag potential issues proactively
- Summarize changes clearly

### Review Checkpoints

**Stop and wait for review when:**
1. Confidence rating <8
2. Making database schema changes
3. Adding new API endpoints
4. Changing authentication/security
5. Modifying multi-tenant logic
6. Before pushing to production

**Example request for review:**
```
"I've implemented the file upload endpoint for the knowledge base.

Changes made:
- Added POST /api/dashboard/knowledge-base/upload
- Implemented file validation (type, size)
- Added multipart form data handling
- Created Directus integration for storage

Confidence: 7/10

Concerns:
- Haven't tested with very large files (>10MB)
- Error handling could be more robust
- Not sure if we should add rate limiting here

Would you like to review before I proceed with the text
extraction and embedding generation?"
```

---

## Common Patterns

### API Endpoint Template
```typescript
import { Router } from 'express';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { validateApiKey } from '../middleware/auth';

const router = Router();

router.post('/endpoint', validateApiKey, async (req, res) => {
  try {
    const { clientId } = req.auth; // Set by validateApiKey middleware
    const { data } = req.body;
    
    // Validate input
    if (!data) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: 'Data is required'
        }
      });
    }
    
    // Process request with clientId filter
    const result = await db.query.table.findFirst({
      where: and(
        eq(table.clientId, clientId),
        // other conditions
      )
    });
    
    return res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error in endpoint:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
});

export default router;
```

### React Component Template
```typescript
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Props {
  clientId: string;
}

export function Component({ clientId }: Props) {
  const [data, setData] = useState<DataType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchData();
  }, [clientId]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/data/${clientId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;
  
  return (
    <div>
      {/* Component implementation */}
    </div>
  );
}
```

---

## Quick Reference

### Project Structure
```
project/
├── client/              # React dashboard
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities
├── server/              # Express API
│   ├── src/
│   │   ├── routes/      # API routes
│   │   └── middleware/  # Express middleware
├── shared/              # Shared code
│   ├── schema.ts        # Database schema
│   └── types.ts         # Shared types
├── public/widget/       # Widget files
└── docs/                # Documentation
```

### Key Files to Know
- `docs/ARCHITECTURE.md` - System design
- `docs/DEVELOPMENT.md` - Development guide
- `docs/IMPLEMENTATION_AUDIT.md` - Current state
- `shared/schema.ts` - Database schema
- `server/src/middleware/auth.ts` - Authentication
- `.clinerules` - Project-specific rules

### Essential Commands
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run check        # Type checking
npm run db:push      # Push DB schema
npm run db:studio    # DB GUI
npm test             # Run tests
```

---

## Remember

✅ **Always analyze before implementing**  
✅ **Never omit code - show complete implementations**  
✅ **Multi-tenant isolation is critical - always filter by clientId**  
✅ **Type safety - no `any` types**  
✅ **Security first - validate everything**  
✅ **Document decisions and changes**  
✅ **Test thoroughly, especially multi-tenant isolation**  
✅ **Ask when uncertain (confidence <8)**  
✅ **Request review at checkpoints**  

---

**Quality over speed. Understanding over output. Security over convenience.**