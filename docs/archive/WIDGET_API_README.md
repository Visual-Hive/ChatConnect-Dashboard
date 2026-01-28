# Widget API Documentation

Complete documentation for the ChatConnect Widget API - secure, multi-tenant chat widget endpoints.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Security](#security)
5. [Integration Guide](#integration-guide)
6. [Error Handling](#error-handling)
7. [Examples](#examples)
8. [Environment Setup](#environment-setup)

---

## Overview

The Widget API provides public-facing endpoints for chat widgets embedded on client websites. Each client is authenticated via a unique public API key (`pk_live_*` format) and isolated from other clients in the system.

**Base URL:** `https://your-domain.com/api/widget`

**Key Features:**
- 🔐 API key authentication (pk_live_* format)
- 🏢 Multi-tenant client isolation
- 🌐 CORS support with domain whitelisting
- ✅ Input validation with Zod
- 🔗 n8n webhook integration
- 📊 Directus knowledge base queries
- ⚡ Real-time chat responses

---

## Authentication

### API Key Format

All widget API requests require authentication via the `x-api-key` header:

```
x-api-key: pk_live_1234567890abcdef
```

### API Key Structure

- **Prefix:** `pk_live_`
- **Format:** `pk_live_[random_string]`
- **Length:** Varies (minimum 20 characters recommended)

### Authentication Flow

1. Client includes API key in request header
2. Server validates key format (`pk_live_*`)
3. Server looks up client by `publicApiKey`
4. Server checks client status (must be `active`)
5. Server validates origin domain (if `allowedDomains` configured)
6. Request proceeds with `clientId` attached

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Missing API key | No `x-api-key` header provided |
| 401 | Invalid API key format | Key doesn't start with `pk_live_` |
| 401 | Invalid API key | Key not found in database |
| 403 | Client account not active | Client status is `paused` or `disabled` |
| 403 | Domain not allowed | Origin domain not in `allowedDomains` |

---

## Endpoints

### 1. POST /api/widget/chat

Process chat messages and return AI-generated responses.

**Authentication:** Required

**Request:**

```json
POST /api/widget/chat
Content-Type: application/json
x-api-key: pk_live_your_key_here

{
  "message": "What are your business hours?",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "pageUrl": "https://example.com/contact",
    "customFields": {
      "userId": "user123",
      "language": "en"
    }
  }
}
```

**Request Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| message | string | Yes | 1-2000 chars | User's chat message |
| sessionId | string | Yes | Valid UUID | Client-side session identifier |
| metadata | object | No | - | Optional context data |
| metadata.userAgent | string | No | - | User's browser user agent |
| metadata.pageUrl | string | No | Valid URL | Page where chat initiated |
| metadata.customFields | object | No | - | Custom key-value pairs |

**Response:**

```json
{
  "response": "We're open Monday-Friday 9am-5pm EST.",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "sources": [
    {
      "title": "Business Hours Policy",
      "url": "https://docs.example.com/hours",
      "excerpt": "Our standard business hours are..."
    }
  ]
}
```

**Response Schema:**

| Field | Type | Description |
|-------|------|-------------|
| response | string | AI-generated response text |
| sessionId | string | Echo of request sessionId |
| sources | array | Optional knowledge base sources (may be empty) |
| sources[].title | string | Source document title |
| sources[].url | string | Optional URL to source |
| sources[].excerpt | string | Relevant excerpt from source |

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Invalid request body (validation failed) |
| 401 | Authentication failed |
| 403 | Client not active or domain not allowed |
| 503 | n8n webhook unavailable |
| 504 | Request timeout (>30 seconds) |
| 500 | Internal server error |

---

### 2. GET /api/widget/config

Fetch widget configuration for rendering and display.

**Authentication:** Required

**Request:**

```
GET /api/widget/config
x-api-key: pk_live_your_key_here
```

**Response:**

```json
{
  "widget": {
    "primaryColor": "#3b82f6",
    "position": "bottom-right",
    "welcomeMessage": "Hi! How can I help you today?",
    "widgetName": "Support Chat"
  }
}
```

**Response Schema:**

| Field | Type | Default | Options | Description |
|-------|------|---------|---------|-------------|
| widget.primaryColor | string | `#3b82f6` | Any hex color | Widget theme color |
| widget.position | string | `bottom-right` | `bottom-right`, `bottom-left`, `top-right`, `top-left` | Widget position on page |
| widget.welcomeMessage | string | `Hi! How can I help?` | Any string | Initial greeting message |
| widget.widgetName | string | `Support` | Any string | Widget title/name |

**Notes:**
- If no configuration exists, default values are returned
- Configuration is specific to the authenticated client
- Changes to configuration require dashboard updates

---

### 3. GET /api/widget/health

Health check endpoint (no authentication required).

**Request:**

```
GET /api/widget/health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-01-19T15:30:00.000Z"
}
```

---

## Security

### Multi-Tenant Isolation

**Client Isolation Guarantees:**

1. ✅ All database queries filtered by `clientId`
2. ✅ No internal IDs exposed in API responses
3. ✅ Each client sees only their own data
4. ✅ Widget configuration isolated per client
5. ✅ n8n webhooks receive correct `clientId`
6. ✅ Directus queries filtered by `clientId`

**What's Protected:**

- Widget configurations
- Chat sessions
- Knowledge base access
- Custom metadata
- Analytics data

### CORS Configuration

The API automatically handles CORS based on the client's `allowedDomains` configuration.

**Behavior:**

1. If `allowedDomains` is empty → Allow all origins (⚠️ not recommended for production)
2. If `allowedDomains` has entries → Only allow matching origins

**Supported Domain Formats:**

```javascript
// Exact domain match
["https://example.com"]

// Wildcard subdomain matching
["*.example.com"]  // Matches api.example.com, app.example.com, etc.

// Multiple domains
["https://example.com", "https://app.example.com", "*.staging.example.com"]
```

**CORS Headers Set:**

```
Access-Control-Allow-Origin: [matched-origin]
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, x-api-key
Access-Control-Allow-Credentials: true
```

### Rate Limiting

**Current Status:** Not yet implemented (ready for future enhancement)

**Planned Implementation:**
- 100 requests per minute per API key
- Rate limit by `publicApiKey`, not IP
- Redis for distributed rate limiting
- Custom limits per client tier

### Best Practices

1. **API Key Storage:**
   - ⚠️ Never commit API keys to version control
   - ✅ Store in environment variables or secure config
   - ✅ Use different keys for dev/staging/production

2. **Domain Validation:**
   - ✅ Always configure `allowedDomains` in production
   - ✅ Use wildcard domains carefully
   - ✅ Test domain validation before deploying

3. **Session Management:**
   - ✅ Generate unique UUIDs for sessionIds
   - ✅ Store sessionIds client-side (localStorage recommended)
   - ✅ Include relevant metadata for context

4. **Error Handling:**
   - ✅ Always handle API errors gracefully
   - ✅ Show user-friendly messages
   - ✅ Log errors for debugging
   - ✅ Implement retry logic for transient failures

---

## Integration Guide

### JavaScript/TypeScript Example

```typescript
class ChatWidget {
  private apiKey: string;
  private baseUrl: string;
  private sessionId: string;

  constructor(apiKey: string, baseUrl: string = 'https://your-domain.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    
    // Get or create session ID
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem('chat_session_id');
    
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('chat_session_id', sessionId);
    }
    
    return sessionId;
  }

  async getConfig() {
    const response = await fetch(`${this.baseUrl}/api/widget/config`, {
      method: 'GET',
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get config: ${response.status}`);
    }

    return response.json();
  }

  async sendMessage(message: string, metadata?: any) {
    const response = await fetch(`${this.baseUrl}/api/widget/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        message,
        sessionId: this.sessionId,
        metadata: {
          userAgent: navigator.userAgent,
          pageUrl: window.location.href,
          ...metadata,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send message');
    }

    return response.json();
  }
}

// Usage
const widget = new ChatWidget('pk_live_your_key_here');

// Initialize widget
const config = await widget.getConfig();
console.log('Widget config:', config);

// Send a message
const response = await widget.sendMessage('Hello!');
console.log('Bot response:', response.response);
```

### React Example

```tsx
import { useState, useEffect } from 'react';

interface WidgetConfig {
  primaryColor: string;
  position: string;
  welcomeMessage: string;
  widgetName: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    title: string;
    url?: string;
    excerpt: string;
  }>;
}

function ChatWidget({ apiKey }: { apiKey: string }) {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('chat_session_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('chat_session_id', newId);
    return newId;
  });

  useEffect(() => {
    // Load widget configuration
    fetch('/api/widget/config', {
      headers: { 'x-api-key': apiKey },
    })
      .then(res => res.json())
      .then(data => setConfig(data.widget))
      .catch(console.error);
  }, [apiKey]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/widget/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          message: input,
          sessionId,
          metadata: {
            userAgent: navigator.userAgent,
            pageUrl: window.location.href,
          },
        }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        sources: data.sources,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Show error message to user
    } finally {
      setLoading(false);
    }
  };

  if (!config) return <div>Loading...</div>;

  return (
    <div style={{ 
      position: 'fixed',
      [config.position.split('-')[0]]: '20px',
      [config.position.split('-')[1]]: '20px',
      width: '350px',
      height: '500px',
      border: `2px solid ${config.primaryColor}`,
      borderRadius: '12px',
      backgroundColor: 'white',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }}>
      {/* Widget implementation */}
    </div>
  );
}
```

### cURL Examples

**Get Widget Configuration:**

```bash
curl -X GET https://your-domain.com/api/widget/config \
  -H "x-api-key: pk_live_your_key_here"
```

**Send Chat Message:**

```bash
curl -X POST https://your-domain.com/api/widget/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: pk_live_your_key_here" \
  -d '{
    "message": "What are your business hours?",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "metadata": {
      "pageUrl": "https://example.com/contact"
    }
  }'
```

**Health Check:**

```bash
curl -X GET https://your-domain.com/api/widget/health
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {} // Optional additional details
}
```

### Common Error Scenarios

#### 1. Invalid API Key

```json
// Request
POST /api/widget/chat
x-api-key: invalid_key

// Response (401)
{
  "error": "Invalid API key format",
  "message": "API key must start with pk_live_"
}
```

#### 2. Client Not Active

```json
// Response (403)
{
  "error": "Client account not active",
  "message": "Your account status is: paused",
  "status": "paused"
}
```

#### 3. Validation Error

```json
// Request
POST /api/widget/chat
{
  "message": "", // Empty message
  "sessionId": "invalid-uuid"
}

// Response (400)
{
  "error": "Invalid request",
  "message": "Validation error: message: Message cannot be empty; sessionId: Session ID must be a valid UUID",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "path": ["message"],
      "message": "Message cannot be empty"
    },
    {
      "code": "invalid_string",
      "validation": "uuid",
      "path": ["sessionId"],
      "message": "Session ID must be a valid UUID"
    }
  ]
}
```

#### 4. n8n Webhook Timeout

```json
// Response (504)
{
  "error": "Request timeout",
  "message": "The request took too long to process. Please try again."
}
```

#### 5. Service Unavailable

```json
// Response (503)
{
  "error": "Service unavailable",
  "message": "Chat service is not configured"
}
```

### Error Handling Best Practices

```typescript
async function sendChatMessage(message: string) {
  try {
    const response = await fetch('/api/widget/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        message,
        sessionId: getSessionId(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle specific error cases
      switch (response.status) {
        case 401:
          console.error('Authentication failed:', error.message);
          // Show login prompt or refresh API key
          break;
        case 403:
          console.error('Access denied:', error.message);
          // Show account status message
          break;
        case 429:
          console.error('Rate limited:', error.message);
          // Show rate limit message, retry after delay
          break;
        case 503:
        case 504:
          console.error('Service unavailable:', error.message);
          // Show service unavailable message, offer retry
          break;
        default:
          console.error('Unexpected error:', error.message);
          // Show generic error message
      }
      
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError) {
      console.error('Network error:', error);
      // Show connection error message
    }
    throw error;
  }
}
```

---

## Environment Setup

### Required Environment Variables

Create a `.env` file in your server directory:

```bash
# n8n Webhook Integration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/chat-widget
N8N_WEBHOOK_SECRET=your_webhook_secret_here

# Directus Integration
DIRECTUS_URL=https://your-directus-instance.com
DIRECTUS_TOKEN=your_directus_admin_token

# Rate Limiting (optional, for future use)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Server Configuration
PORT=5000
NODE_ENV=production
```

### Development Setup

1. **Install Dependencies:**

```bash
npm install
```

2. **Configure Environment:**

```bash
cp .env.example .env
# Edit .env with your values
```

3. **Run Development Server:**

```bash
npm run dev
```

4. **Test Endpoints:**

```bash
# Health check
curl http://localhost:5000/api/widget/health

# Config (requires API key)
curl http://localhost:5000/api/widget/config \
  -H "x-api-key: pk_live_test_key"
```

### Production Deployment

1. **Build Application:**

```bash
npm run build
```

2. **Set Environment Variables:**

Ensure all required environment variables are set in your production environment.

3. **Start Production Server:**

```bash
npm start
```

4. **Configure HTTPS:**

Always use HTTPS in production for API key security.

5. **Set Up Monitoring:**

Monitor the following:
- API response times
- Error rates
- n8n webhook availability
- Rate limit hits

---

## Testing

### Manual Testing with Postman/Insomnia

**Collection Structure:**

```
Widget API
├── Authentication Tests
│   ├── Valid API Key
│   ├── Invalid API Key Format
│   ├── Missing API Key
│   └── Inactive Client
├── Chat Endpoint
│   ├── Valid Request
│   ├── Empty Message
│   ├── Invalid SessionId
│   └── Message Too Long
├── Config Endpoint
│   ├── Get Config
│   └── Get Default Config
└── Health Check
```

### Automated Testing

```typescript
// Example test with Jest
describe('Widget API', () => {
  const validApiKey = 'pk_live_test_key';
  const baseUrl = 'http://localhost:5000/api/widget';

  describe('Authentication', () => {
    test('should reject requests without API key', async () => {
      const response = await fetch(`${baseUrl}/config`);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Missing API key');
    });

    test('should reject invalid API key format', async () => {
      const response = await fetch(`${baseUrl}/config`, {
        headers: { 'x-api-key': 'invalid_key' },
      });
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Invalid API key format');
    });
  });

  describe('Chat Endpoint', () => {
    test('should process valid chat request', async () => {
      const response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': validApiKey,
        },
        body: JSON.stringify({
          message: 'Hello!',
          sessionId: crypto.randomUUID(),
        }),
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('response');
      expect(data).toHaveProperty('sessionId');
    });
  });
});
```

---

## Support & Troubleshooting

### Common Issues

**Issue: "Invalid API key" error even with correct key**

Solution:
- Verify key is exactly `pk_live_*` format
- Check for whitespace in key
- Ensure client status is "active"
- Verify key exists in database

**Issue: CORS errors in browser**

Solution:
- Add origin domain to client's `allowedDomains`
- Check domain format (include protocol: `https://`)
- Test with wildcard: `*.yourdomain.com`
- Verify API is sending CORS headers

**Issue: "Service unavailable" error**

Solution:
- Check N8N_WEBHOOK_URL is configured
- Verify n8n webhook is accessible
- Check n8n workflow is active
- Review n8n logs for errors

**Issue: Timeout errors**

Solution:
- Optimize n8n workflow performance
- Reduce knowledge base query size
- Implement caching for common queries
- Consider async processing for complex requests

### Debug Mode

Enable debug logging:

```typescript
// In your widget implementation
const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[ChatWidget]', ...args);
  }
}

// Usage
log('Sending message:', message);
log('Response received:', response);
```

---

## Changelog

### v1.0.0 (2025-01-19)

- ✅ Initial implementation
- ✅ API key authentication (`pk_live_*` format)
- ✅ Multi-tenant client isolation
- ✅ POST /api/widget/chat endpoint
- ✅ GET /api/widget/config endpoint
- ✅ GET /api/widget/health endpoint
- ✅ CORS support with domain whitelisting
- ✅ Zod validation for all inputs
- ✅ n8n webhook integration
- ✅ Error handling and logging
- ✅ TypeScript types throughout

### Roadmap

**v1.1.0 (Planned)**
- Rate limiting implementation
- Request/response logging
- Analytics tracking
- Webhook signature verification

**v1.2.0 (Planned)**
- File upload support in chat
- Streaming responses (SSE)
- Multi-language support
- Custom branding per client

**v2.0.0 (Future)**
- WebSocket support for real-time chat
- Voice message support
- Advanced analytics dashboard
- A/B testing framework

---

## License

[Add your license information here]

---

## Contact

For API support, integration help, or bug reports:
- Documentation: https://docs.your-domain.com
- Email: support@your-domain.com
- GitHub Issues: https://github.com/your-org/your-repo/issues
