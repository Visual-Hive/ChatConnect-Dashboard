# Human Review Guide for AI-Assisted Development

This guide helps you work effectively with Claude Code (or other AI coding assistants) on this project. It defines **when** you need to intervene, **what** to review, and **how** to verify quality.

---

## 🎯 The Goal

Let Claude Code handle routine implementation while you:
- Verify security-critical code
- Review architectural decisions
- Ensure quality and correctness
- Make judgment calls on UX and business logic

---

## 🚦 When to Review (Traffic Light System)

### 🔴 STOP - Always Review These

**Security-Critical Code**
- Any database query (verify `clientId` filtering)
- Any Qdrant query (verify `client_id` filtering)
- API key validation logic
- Authentication/authorization middleware
- Rate limiting implementation
- File upload handling

**Cost-Affecting Code**
- LLM provider selection (tier logic)
- Token counting and billing
- Rate limit thresholds
- Caching decisions (affects API costs)

**Architectural Changes**
- New API endpoints (verify contract)
- Database schema changes
- New dependencies
- Changes to data flow between services

**Example Review Trigger:**
```python
# ⚠️ REVIEW THIS - Contains Qdrant query
results = await qdrant.search(
    collection_name="documents",
    query_vector=embedding,
    query_filter=Filter(must=[
        FieldCondition(key="client_id", match=MatchValue(value=client_id))
    ])
)
# ✅ Verify: client_id filter is present
```

### 🟡 SPOT CHECK - Review Periodically

- Complex business logic
- Error handling patterns
- Prompt engineering
- Test coverage
- Performance-sensitive code

### 🟢 LET IT GO - Trust the AI

- Boilerplate code
- Type definitions
- Simple CRUD operations (after verifying pattern once)
- Import statements
- Logging statements
- Documentation/comments

---

## 📋 Review Checklist by Component

### Python Backend Services

#### Qdrant Service (`src/services/qdrant.py`)
- [ ] Every search query includes `client_id` filter
- [ ] No queries without tenant filtering
- [ ] Collection name is correct
- [ ] Error handling for connection issues

#### LLM Service (`src/services/llm.py`)
- [ ] Tier selection logic is correct (free → GPT-4o-mini, paid → Claude)
- [ ] Prompt caching is implemented for Anthropic
- [ ] Token tracking is accurate
- [ ] Streaming works correctly
- [ ] Error handling for rate limits

#### PostgreSQL Service (`src/services/postgres.py`)
- [ ] Every query includes `client_id` WHERE clause
- [ ] Parameterized queries only (no SQL injection)
- [ ] Connection pooling configured
- [ ] Transactions where needed

### LangGraph Workflow

#### Retrieve Node
- [ ] Client ID passed correctly to Qdrant
- [ ] Relevance scoring makes sense
- [ ] Result limit is appropriate (not too many, not too few)

#### Generate Node
- [ ] System prompt doesn't expose sensitive data
- [ ] User input is sanitized
- [ ] Context is formatted correctly
- [ ] Source citations are accurate

#### Log Node
- [ ] Logging is async (doesn't block response)
- [ ] Errors in logging don't crash the request

### API Endpoints

#### Chat Endpoints
- [ ] API key validation is secure (constant-time comparison)
- [ ] Request validation rejects malformed input
- [ ] Response format matches widget expectations
- [ ] Error responses don't leak internal details

---

## 🔍 How to Review

### 1. Security Review Pattern

```
For each database/vector query:
1. Find WHERE clause or filter
2. Verify client_id is included
3. Verify it uses the correct variable (from authenticated context)
4. Check it's not overridable by user input
```

**Good:**
```python
# client_id comes from validated API key lookup
where: and(
    eq(table.clientId, request.auth.clientId),
    eq(table.id, documentId)
)
```

**Bad:**
```python
# client_id comes from user request body - DANGEROUS!
where: and(
    eq(table.clientId, request.body.clientId),  # ← Attacker controlled!
    eq(table.id, documentId)
)
```

### 2. Cost Review Pattern

```
For LLM calls:
1. Verify model selection logic
2. Check token limits are reasonable
3. Verify caching is used where possible
4. Ensure streaming is used for user-facing responses
```

### 3. Quality Review Pattern

```
For new features:
1. Does it handle errors gracefully?
2. Are edge cases covered?
3. Is it tested?
4. Does it follow existing patterns?
```

---

## 🛑 Stop Signals

**Stop Claude Code and intervene if you see:**

1. **Missing tenant filter** - "Let me search the documents table..."
   - ASK: "Is this query filtering by client_id?"

2. **Direct SQL strings** - "I'll execute this query..."
   - ASK: "Is this using parameterized queries?"

3. **User input in sensitive places** - "Using the client_id from the request body..."
   - ASK: "Where does this client_id come from? Should it be from the auth context?"

4. **New external dependencies** - "I'll add this npm/pip package..."
   - ASK: "Is this dependency necessary? What does it do?"

5. **Changing core patterns** - "I'll change how authentication works..."
   - STOP: Review the change carefully before proceeding

---

## ✅ Approval Workflow

### For P0/Security-Critical Tasks

```
1. Claude completes implementation
2. Claude requests review (or you notice it's done)
3. You review using checklist above
4. If issues: Point them out, ask Claude to fix
5. If good: Approve and let Claude continue
```

### For P1/Standard Tasks

```
1. Claude completes implementation
2. Spot check key areas (see checklists)
3. Run tests if applicable
4. Quick approval or quick fix
```

### For P2/Low-Risk Tasks

```
1. Claude completes implementation
2. Glance at it for obvious issues
3. Move on
```

---

## 📝 Communication Templates

### When Starting a Session

> "I want to implement [TASK]. This is a [P0/P1/P2] task.
> Please read `.clinerules/clinerules` and `docs/implementation/TASKS.md` first.
> Stop for my review when you complete the [security-critical part]."

### When Reviewing

> "Let me review this before you continue.
> [Point out issues or confirm it's good]
> You can continue now."

### When Concerned

> "Hold on - I need to verify the multi-tenant isolation in this query.
> Can you show me where the client_id filter is applied?"

### When Approving

> "✅ Reviewed - this looks good.
> The client_id filtering is correct.
> Please continue with the next task."

---

## 🧪 Verification Steps

### After Completing a Service

```bash
# Run type check
cd ai-backend && mypy src/

# Run tests
pytest tests/ -v

# Manual test
curl -X POST http://localhost:8000/api/widget/chat \
  -H "x-api-key: pk_live_test" \
  -d '{"message": "test", "sessionId": "test-123"}'
```

### After Completing a Feature

```bash
# Start all services
docker-compose up -d

# Test widget embedding
open public/widget-test.html

# Check logs for errors
docker-compose logs -f ai-backend
```

### Multi-Tenant Verification

```sql
-- Create test data for two clients
INSERT INTO clients (id, name) VALUES 
  ('client-1', 'Test Client 1'),
  ('client-2', 'Test Client 2');

-- Add documents for each
INSERT INTO documents (client_id, content) VALUES
  ('client-1', 'Client 1 secret data'),
  ('client-2', 'Client 2 secret data');

-- Test query as client-1 should NOT return client-2 data
SELECT * FROM documents WHERE client_id = 'client-1';
-- Expected: Only client-1's document
```

---

## 📊 Review Time Estimates

| Task Type | Review Time | Notes |
|-----------|-------------|-------|
| Qdrant query | 2-3 min | Check filter |
| PostgreSQL query | 2-3 min | Check WHERE clause |
| API endpoint | 5-10 min | Check auth, validation, response |
| LangGraph node | 10-15 min | Check logic flow |
| Full service | 20-30 min | Comprehensive review |

---

## 🆘 Getting Help

If you're unsure whether something is safe:

1. **Ask Claude to explain** - "Why is this approach safe for multi-tenancy?"
2. **Check the patterns** - Compare to existing code in the same area
3. **Check the clinerules** - `.clinerules/clinerules` has security patterns
4. **When in doubt, review** - Better safe than sorry with security

---

## Summary

| What | When | How Long |
|------|------|----------|
| Security review | Every DB/vector query | 2-5 min |
| Cost review | LLM/billing code | 5-10 min |
| Architecture review | New endpoints/patterns | 10-20 min |
| Spot check | Periodically | 2-3 min |
| Trust and move on | Boilerplate | Skip |

**Remember:** The goal is efficient development while maintaining security and quality. Review smart, not everything.
