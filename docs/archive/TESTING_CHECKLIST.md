# Testing Checklist

**Version:** 1.0  
**Last Updated:** January 19, 2025  
**Purpose:** Comprehensive testing procedures for Conference Chat Dashboard

## Overview

This document provides detailed testing checklists for:
1. **Component Testing** - Individual component verification
2. **Integration Testing** - Multi-component workflows
3. **Regression Testing** - Existing functionality preservation
4. **Security Testing** - Authentication, authorization, data isolation
5. **Performance Testing** - Load, stress, and scalability
6. **Cross-Browser Testing** - Browser compatibility
7. **Mobile Testing** - Responsive design verification
8. **End-to-End Testing** - Complete user workflows

---

## Pre-Testing Setup

### Environment Preparation

- [ ] Local development server running (`npm run dev`)
- [ ] PostgreSQL database connected
- [ ] Directus instance accessible
- [ ] n8n workflow active
- [ ] Test data prepared
- [ ] Browser dev tools available

### Test Accounts

Create these test accounts:

**Account 1: Primary User**
- Username: `test_user_1`
- Password: `TestPass123!`
- Client: Auto-created on signup

**Account 2: Secondary User**
- Username: `test_user_2`
- Password: `TestPass123!`
- Client: Auto-created on signup

**Account 3: Admin User**
- Username: `admin_user`
- Password: `AdminPass123!`
- Client: Auto-created on signup

---

## 1. Authentication & Authorization Tests

### 1.1 User Registration

**Test Case:** New user can register

- [ ] Navigate to `/login`
- [ ] Click "Register" or "Sign Up"
- [ ] Enter username: `test_new_user`
- [ ] Enter password: `NewPass123!`
- [ ] Click "Register"
- [ ] Verify redirect to dashboard
- [ ] Verify user session created
- [ ] Verify client auto-created in database
- [ ] Verify widget config auto-created

**Expected Result:** User successfully registered and redirected to dashboard

**Test Case:** Registration validation

- [ ] Try username < 3 characters → Error: "Username too short"
- [ ] Try password < 8 characters → Error: "Password too short"
- [ ] Try duplicate username → Error: "Username already exists"
- [ ] Try empty fields → Error: "Required fields"

---

### 1.2 User Login

**Test Case:** Valid login

- [ ] Navigate to `/login`
- [ ] Enter username: `test_user_1`
- [ ] Enter password: `TestPass123!`
- [ ] Click "Login"
- [ ] Verify redirect to dashboard
- [ ] Verify session cookie set
- [ ] Verify user data loaded

**Test Case:** Invalid login

- [ ] Wrong password → Error: "Invalid credentials"
- [ ] Wrong username → Error: "Invalid credentials"
- [ ] Empty fields → Error: "Required fields"

---

### 1.3 Session Management

**Test Case:** Session persistence

- [ ] Login successfully
- [ ] Close browser tab
- [ ] Reopen application
- [ ] Verify still logged in
- [ ] Verify dashboard loads

**Test Case:** Logout

- [ ] Click "Logout" button
- [ ] Verify redirect to login page
- [ ] Verify session destroyed
- [ ] Try accessing `/dashboard` → Redirect to login
- [ ] Verify cannot access protected routes

---

### 1.4 Protected Routes

**Test Case:** Unauthenticated access blocked

- [ ] Logout if logged in
- [ ] Try accessing `/dashboard` → Redirect to `/login`
- [ ] Try accessing `/settings` → Redirect to `/login`
- [ ] Try accessing `/widget-config` → Redirect to `/login`
- [ ] Try accessing `/knowledge-base` → Redirect to `/login`

**Test Case:** API endpoints protected

```bash
# Without session cookie
curl http://localhost:5000/api/dashboard/clients

# Expected: 401 Unauthorized
```

---

## 2. Widget Configuration Tests

### 2.1 Load Widget Configuration

**Test Case:** Configuration loads correctly

- [ ] Login as `test_user_1`
- [ ] Navigate to Widget Configuration page
- [ ] Verify page loads without errors
- [ ] Verify widget preview displays
- [ ] Verify form fields populated with default/saved values
- [ ] Verify API key displayed

---

### 2.2 Update Widget Settings

**Test Case:** Change primary color

- [ ] Change primary color to `#ff5733`
- [ ] Click "Save Configuration"
- [ ] Verify success message
- [ ] Verify widget preview updates with new color
- [ ] Refresh page
- [ ] Verify color persisted

**Test Case:** Change widget name

- [ ] Change widget name to "Conference Support"
- [ ] Save configuration
- [ ] Verify success message
- [ ] Verify preview updates
- [ ] Reload page
- [ ] Verify name persisted

**Test Case:** Change welcome message

- [ ] Change welcome message to "Welcome! How can we assist you?"
- [ ] Save configuration
- [ ] Verify success message
- [ ] Verify preview updates
- [ ] Verify persisted after reload

**Test Case:** Change position

- [ ] Select "Bottom Left" position
- [ ] Save configuration
- [ ] Verify preview widget moves to left
- [ ] Verify persisted after reload

---

### 2.3 Widget Code Generation

**Test Case:** Generate embedding code

- [ ] Click "Generate Widget Code"
- [ ] Verify code block appears
- [ ] Verify API key present in code
- [ ] Verify correct base URL
- [ ] Copy code to clipboard
- [ ] Paste in text editor
- [ ] Verify code is valid HTML

---

## 3. Settings Page Tests

### 3.1 Account Settings

**Test Case:** View account information

- [ ] Navigate to Settings
- [ ] Verify username displayed (read-only)
- [ ] Verify client name displayed
- [ ] Verify client ID displayed

**Test Case:** Update client name

- [ ] Change client name to "Test Conference 2025"
- [ ] Click "Save Changes"
- [ ] Verify success message
- [ ] Refresh page
- [ ] Verify new name persisted

---

### 3.2 API Key Management

**Test Case:** View API key

- [ ] Navigate to Settings → API tab
- [ ] Verify API key displayed (masked)
- [ ] Click eye icon to reveal
- [ ] Verify full key visible
- [ ] Click eye icon to hide
- [ ] Verify key masked again

**Test Case:** Copy API key

- [ ] Click copy button
- [ ] Paste in text editor
- [ ] Verify full key copied
- [ ] Verify key starts with `pk_live_`

**Test Case:** Regenerate API key

- [ ] Note current API key
- [ ] Click "Regenerate Key"
- [ ] Confirm in dialog
- [ ] Verify new key generated
- [ ] Verify new key different from old key
- [ ] Verify old key no longer works (test widget)
- [ ] Verify new key works

---

### 3.3 Domain Restrictions

**Test Case:** Add allowed domain

- [ ] Navigate to Settings → API tab
- [ ] Enter domain: `example.com`
- [ ] Click "Add"
- [ ] Verify domain appears in list
- [ ] Verify success message

**Test Case:** Add wildcard domain

- [ ] Enter domain: `*.mysite.com`
- [ ] Click "Add"
- [ ] Verify domain added
- [ ] Verify wildcard format accepted

**Test Case:** Remove domain

- [ ] Click "X" on a domain
- [ ] Verify domain removed from list
- [ ] Verify success message

**Test Case:** Empty domains (allow all)

- [ ] Remove all domains
- [ ] Verify message: "No domain restrictions"
- [ ] Test widget from any domain → Should work

---

## 4. Widget API Tests

### 4.1 Widget Config Endpoint

**Test Case:** Valid API key

```bash
curl http://localhost:5000/api/widget/config \
  -H "x-api-key: pk_live_YOUR_KEY"
```

- [ ] Verify 200 status
- [ ] Verify JSON response
- [ ] Verify primaryColor present
- [ ] Verify position present
- [ ] Verify welcomeMessage present
- [ ] Verify widgetName present

**Test Case:** Invalid API key

```bash
curl http://localhost:5000/api/widget/config \
  -H "x-api-key: pk_live_invalid"
```

- [ ] Verify 401 status
- [ ] Verify error message

**Test Case:** Missing API key

```bash
curl http://localhost:5000/api/widget/config
```

- [ ] Verify 401 status
- [ ] Verify error: "Missing API key"

**Test Case:** Wrong key format

```bash
curl http://localhost:5000/api/widget/config \
  -H "x-api-key: invalid_format"
```

- [ ] Verify 401 status
- [ ] Verify error: "Invalid API key format"

---

### 4.2 Widget Chat Endpoint

**Test Case:** Valid chat request

```bash
curl -X POST http://localhost:5000/api/widget/chat \
  -H "x-api-key: pk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test message",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "metadata": {
      "userAgent": "Test",
      "pageUrl": "http://test.com"
    }
  }'
```

- [ ] Verify 200 status (or 503 if n8n not configured)
- [ ] Verify response structure
- [ ] Verify sessionId echoed back

**Test Case:** Invalid request body

```bash
# Missing required fields
curl -X POST http://localhost:5000/api/widget/chat \
  -H "x-api-key: pk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

- [ ] Verify 400 status
- [ ] Verify validation error message

**Test Case:** Message too long

```bash
# Message > 2000 characters
curl -X POST http://localhost:5000/api/widget/chat \
  -H "x-api-key: pk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"$(python -c 'print(\"a\" * 2001)')\", \"sessionId\": \"...\"}"
```

- [ ] Verify 400 status
- [ ] Verify error: "Message cannot exceed 2000 characters"

---

### 4.3 CORS Tests

**Test Case:** Allowed domain

```bash
curl http://localhost:5000/api/widget/config \
  -H "x-api-key: pk_live_YOUR_KEY" \
  -H "Origin: https://example.com"
```

- [ ] Verify `Access-Control-Allow-Origin` header present
- [ ] Verify value matches origin

**Test Case:** Disallowed domain (when restrictions set)

```bash
curl http://localhost:5000/api/widget/config \
  -H "x-api-key: pk_live_YOUR_KEY" \
  -H "Origin: https://notallowed.com"
```

- [ ] Verify 403 status
- [ ] Verify error: "Domain not allowed"

**Test Case:** Preflight request

```bash
curl -X OPTIONS http://localhost:5000/api/widget/config \
  -H "Origin: https://example.com"
```

- [ ] Verify 204 status
- [ ] Verify CORS headers present

---

## 5. Client Isolation Tests

### 5.1 Widget Configuration Isolation

**Test Case:** Cannot access other client's config

- [ ] Login as `test_user_1`
- [ ] Note your clientId from settings
- [ ] Get `test_user_2`'s clientId
- [ ] Try: `GET /api/dashboard/widget/{test_user_2_clientId}`
- [ ] Verify 403 Forbidden
- [ ] Verify cannot see other client's data

---

### 5.2 API Key Isolation

**Test Case:** API key only returns own config

- [ ] Login as `test_user_1`
- [ ] Get API key
- [ ] Call `/api/widget/config` with key
- [ ] Verify returns `test_user_1`'s config only
- [ ] Login as `test_user_2`
- [ ] Get API key
- [ ] Call `/api/widget/config` with key
- [ ] Verify returns `test_user_2`'s config only

---

### 5.3 Directus Data Isolation (Manual)

**Test Case:** Knowledge base queries filtered

- [ ] Add document in Directus for client_1
- [ ] Add document in Directus for client_2
- [ ] Send chat with client_1's API key
- [ ] Verify only client_1's documents queried
- [ ] Send chat with client_2's API key
- [ ] Verify only client_2's documents queried

---

## 6. Knowledge Base Tests (UI Only Currently)

### 6.1 File Upload Interface

**Test Case:** Upload valid file

- [ ] Navigate to Knowledge Base
- [ ] Click "Upload" or drag file
- [ ] Select a PDF file (< 10MB)
- [ ] Verify file appears in upload queue
- [ ] Verify file size displayed
- [ ] Verify file type validated

**Test Case:** Invalid file type

- [ ] Try uploading .exe file
- [ ] Verify error: "Invalid file type"
- [ ] Verify file not added to queue

**Test Case:** File too large

- [ ] Try uploading file > 10MB
- [ ] Verify error: "File too large"
- [ ] Verify file not added to queue

---

### 6.2 Tag Management

**Test Case:** Create new tag

- [ ] Click "Create Tag" or "+"
- [ ] Enter name: "Conference Info"
- [ ] Select color: Blue
- [ ] Click "Create"
- [ ] Verify tag appears in list
- [ ] Verify tag color displayed

**Test Case:** Edit tag prompt

- [ ] Click on a tag to expand
- [ ] Edit system prompt
- [ ] Click "Save"
- [ ] Verify success message
- [ ] Collapse and re-expand
- [ ] Verify prompt saved

**Test Case:** Delete tag

- [ ] Click delete on a tag
- [ ] Confirm deletion
- [ ] Verify tag removed
- [ ] Verify documents no longer have that tag

---

## 7. Widget Embed Tests

### 7.1 Widget Loading

**Test Case:** Widget loads on test page

- [ ] Open `public/widget-test.html` in browser
- [ ] Replace API key with valid key
- [ ] Reload page
- [ ] Verify widget button appears (bottom-right or bottom-left)
- [ ] Verify button has correct color
- [ ] Verify no console errors

**Test Case:** Widget loads with config

- [ ] Set primary color in dashboard: `#ff5733`
- [ ] Reload widget test page
- [ ] Verify button color matches
- [ ] Click button
- [ ] Verify chat window opens
- [ ] Verify welcome message displays
- [ ] Verify widget name in header

---

### 7.2 Widget Interaction

**Test Case:** Send message

- [ ] Open widget
- [ ] Type message: "Hello"
- [ ] Click send (or press Enter)
- [ ] Verify message appears in chat (right-aligned)
- [ ] Verify typing indicator appears
- [ ] Wait for response
- [ ] Verify response appears (left-aligned)
- [ ] Verify timestamp displayed

**Test Case:** Message persistence

- [ ] Send a message
- [ ] Receive response
- [ ] Close widget
- [ ] Refresh page
- [ ] Open widget
- [ ] Verify message history
