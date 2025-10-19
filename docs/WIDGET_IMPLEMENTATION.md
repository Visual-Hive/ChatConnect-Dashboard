# Embeddable Widget Implementation

## Overview

This document describes the implementation of the Conference Chat embeddable widget system, including the JavaScript widget, CSS styles, serving infrastructure, and integration instructions.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Website                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   <script>                                            │  │
│  │     window.ConferenceChatConfig = {                   │  │
│  │       apiKey: 'pk_live_xxx',                          │  │
│  │       baseUrl: 'https://yoursite.com/api/widget'      │  │
│  │     };                                                │  │
│  │   </script>                                           │  │
│  │   <script src="/widget/v1/widget.js"></script>        │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Conference Chat Widget (Loaded)               │  │
│  │  • Fetches /api/widget/config (with API key)          │  │
│  │  • Creates isolated chat UI                           │  │
│  │  • Manages session & localStorage                     │  │
│  │  • Sends messages to /api/widget/chat                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                   Your Server                                │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Widget Files     │  │  Widget API       │                │
│  │ /widget/v1/      │  │  /api/widget/     │                │
│  │ • widget.js      │  │  • /config        │                │
│  │ • widget.css     │  │  • /chat          │                │
│  └──────────────────┘  └──────────────────┘                 │
│           ↓                      ↓                           │
│  ┌──────────────────────────────────────────┐               │
│  │    Authentication & Processing            │               │
│  │  • API key validation                     │               │
│  │  • CORS handling                          │               │
│  │  • N8N webhook integration                │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

## Files Created

### 1. `public/widget/v1/widget.js` (Main Widget Script)

**Size:** ~15KB (minified would be ~7KB)

**Key Features:**
- Self-initializing IIFE (Immediately Invoked Function Expression)
- No external dependencies
- Session management with UUID generation
- Message persistence in localStorage
- Automatic config fetching from API
- Real-time chat with typing indicators
- Error handling with retry logic
- XSS prevention through HTML sanitization
- Responsive design support
- Cross-browser compatibility

**Main Components:**

```javascript
class ConferenceChatWidget {
  // State management
  - sessionId (UUID, stored in localStorage)
  - messages (persisted in localStorage)
  - config (fetched from API)
  - isOpen, isTyping states
  
  // Core methods
  - init(): Initialize widget
  - fetchConfig(): Get configuration from API
  - createUI(): Build DOM structure
  - sendMessage(): Handle message sending
  - sendToAPI(): API communication with timeout
  - addMessage(): Add message to chat
  - renderMessage(): Render individual message
  - showTyping/hideTyping(): Typing indicator
  - showError(): Display error messages
}
```

**Initialization:**
```javascript
// Via window.ConferenceChatConfig (recommended)
window.ConferenceChatConfig = {
  apiKey: 'pk_live_xxx',
  baseUrl: 'https://yoursite.com/api/widget'
};

// Or via data attributes (fallback)
<script 
  src="/widget/v1/widget.js"
  data-api-key="pk_live_xxx"
  data-base-url="https://yoursite.com/api/widget"
></script>
```

### 2. `public/widget/v1/widget.css` (Widget Styles)

**Size:** ~6KB

**Key Features:**
- CSS custom properties for theming
- Mobile-first responsive design
- Smooth animations and transitions
- High z-index for overlay positioning
- Accessibility support (focus states)
- Print styles (hide widget)
- Reduced motion support
- Custom scrollbar styling

**CSS Variables:**
```css
--cc-primary-color: #3b82f6
--cc-primary-hover: #2563eb
--cc-text-color: #1f2937
--cc-bg-color: #ffffff
--cc-shadow: 0 10px 25px rgba(0, 0, 0, 0.1)
```

**Responsive Breakpoints:**
- Desktop: Default (400px width, 600px height)
- Mobile (<480px): Full-screen mode

### 3. `server/routes/widget-serve.ts` (File Serving)

**Purpose:** Serve widget files with CDN-friendly headers

**Endpoints:**
- `GET /widget/v1/widget.js` - Serve JavaScript file
- `GET /widget/v1/widget.css` - Serve CSS file
- `GET /widget/version` - Version information
- `OPTIONS /widget/v1/*` - CORS preflight

**Headers Set:**
```
Content-Type: application/javascript | text/css
Cache-Control: public, max-age=3600, s-maxage=86400
Access-Control-Allow-Origin: *
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
ETag: <content-hash>
```

**Features:**
- ETag-based caching (304 Not Modified)
- CDN-friendly cache headers (1h browser, 24h CDN)
- CORS support for cross-origin loading
- Security headers
- File existence checking
- Error handling

### 4. `public/widget-test.html` (Test Page)

A full-featured test page demonstrating the widget in a realistic scenario. Includes:
- Professional design mimicking a conference website
- Instructions for testing
- Multiple sections to test scrolling
- Mobile responsive layout

## Integration Guide

### Basic Integration

Add the following code before the closing `</body>` tag on your website:

```html
<script>
  window.ConferenceChatConfig = {
    apiKey: 'pk_live_your_api_key_here',
    baseUrl: 'https://yoursite.com/api/widget'
  };
</script>
<script src="https://yoursite.com/widget/v1/widget.js"></script>
```

### Configuration Options

The widget reads configuration from the API but can also accept these initialization parameters:

```javascript
window.ConferenceChatConfig = {
  apiKey: 'pk_live_xxx',           // Required: Your public API key
  baseUrl: '/api/widget',          // Optional: API base URL (default: window.location.origin + '/api/widget')
  primaryColor: '#3b82f6',         // Optional: Override primary color
  position: 'bottom-right'         // Optional: 'bottom-right' or 'bottom-left'
};
```

### Advanced Integration

#### With Custom Domain

```javascript
window.ConferenceChatConfig = {
  apiKey: 'pk_live_xxx',
  baseUrl: 'https://api.yoursite.com/api/widget'
};
```

#### Programmatic Control

```javascript
// Access the widget instance
const widget = window.ConferenceChatWidget;

// Methods available (advanced use cases):
// Note: These are internal and may change
```

## Features

### 1. Session Management

- **UUID-based sessions:** Each visitor gets a unique session ID
- **localStorage persistence:** Sessions persist across page reloads
- **Message history:** Messages stored locally and restored on return
- **Future enhancement:** Cloud sync when user logs in

### 2. Chat Interface

**Minimized State:**
- Floating button (60px diameter)
- Positioned bottom-right or bottom-left
- Smooth hover effects
- Icon animation on toggle

**Expanded State:**
- Header with widget name and close button
- Scrollable messages area
- User messages (right-aligned, primary color)
- AI messages (left-aligned, white background)
- Auto-resizing textarea input
- Send button with icon
- Timestamps on messages

### 3. Message Flow

1. User opens widget → Displays welcome message
2. User types message → Local validation (1-2000 chars)
3. Message sent → Shows immediately in UI
4. API request → Typing indicator appears
5. Response received → AI message displayed
6. Error handling → User-friendly error message

### 4. Error Handling

**Types of Errors Handled:**
- Network errors (offline detection)
- Timeout errors (30s limit)
- API errors (4xx, 5xx)
- Invalid configuration
- Rate limiting

**Error Messages:**
- "Connection lost. Please check your internet."
- "Request timed out. Please try again."
- "Failed to send message. Please try again."
- Custom API error messages

### 5. Security Features

**XSS Prevention:**
- HTML sanitization using textContent
- No innerHTML for user content
- Escaped HTML in source citations

**API Security:**
- Public key authentication only
- Domain validation on server
- CORS properly configured
- No sensitive data in widget code

**Content Security Policy:**
- No inline scripts (except config)
- External resource loading controlled
- nonce/hash support ready

### 6. Performance Optimizations

**Script Loading:**
- Async/defer compatible
- No blocking JavaScript
- Lazy CSS loading
- Small file size (~7KB minified JS)

**Runtime Performance:**
- Efficient DOM manipulation
- Debounced scroll events
- Request deduplication
- localStorage caching

**CDN Ready:**
- Aggressive caching headers
- ETag support for conditional requests
- Immutable file structure
- Version-based URLs

## API Integration

### Widget Config Endpoint

**Request:**
```
GET /api/widget/config
Headers:
  x-api-key: pk_live_xxx
```

**Response:**
```json
{
  "widget": {
    "primaryColor": "#3b82f6",
    "position": "bottom-right",
    "welcomeMessage": "Hi! How can I help?",
    "widgetName": "Support"
  }
}
```

### Chat Endpoint

**Request:**
```
POST /api/widget/chat
Headers:
  x-api-key: pk_live_xxx
  Content-Type: application/json
Body:
{
  "message": "What time does the conference start?",
  "sessionId": "uuid-here",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "pageUrl": "https://example.com/page"
  }
}
```

**Response:**
```json
{
  "response": "The conference starts at 9:00 AM.",
  "sessionId": "uuid-here",
  "sources": [
    {
      "title": "Conference Schedule",
      "url": "https://example.com/schedule",
      "excerpt": "Opening keynote begins at 9:00 AM..."
    }
  ]
}
```

## Testing

### Local Testing

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Get a test API key:**
   - Login to dashboard
   - Navigate to Settings
   - Copy your Public API Key (pk_live_xxx)

3. **Open test page:**
   - Navigate to `http://localhost:5000/widget-test.html`
   - Replace `YOUR_API_KEY_HERE` with your actual key
   - Click the chat button in bottom-right

4. **Test scenarios:**
   - [ ] Widget appears and loads
   - [ ] Welcome message displays on first open
   - [ ] Can send messages
   - [ ] Typing indicator appears
   - [ ] Receives responses
   - [ ] Messages persist on page reload
   - [ ] Error handling (disconnect network)
   - [ ] Mobile responsive (resize window)
   - [ ] Keyboard navigation (Tab, Enter)

### Cross-Browser Testing

Test in these browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (Desktop & iOS)
- ✅ Chrome Mobile (Android)

### Integration Testing

**Test on different sites:**
1. Simple HTML page
2. React/Vue application
3. WordPress site
4. With strict CSP headers
5. Inside iframes

## Deployment

### Production Checklist

- [ ] Minify widget.js and widget.css
- [ ] Set up CDN for widget files
- [ ] Configure proper CORS headers
- [ ] Set cache headers (long TTL)
- [ ] Test with real API keys
- [ ] Monitor error rates
- [ ] Set up version tracking

### CDN Configuration

**Recommended CDN Setup:**
```
https://cdn.yoursite.com/widget/v1/widget.js
https://cdn.yoursite.com/widget/v1/widget.css
```

**CloudFlare Settings:**
- Browser Cache TTL: 4 hours
- Edge Cache TTL: 1 month
- Always Online: Enabled
- Minification: Enabled

### Version Management

**Current approach:**
- Version in URL path (/v1/)
- Allows breaking changes in /v2/
- Clients can stay on stable version

**Future improvements:**
- Semantic versioning (1.0.0)
- Changelog tracking
- Deprecation notices

## Customization

### Theme Colors

Colors are set via CSS custom properties and can be overridden:

```css
:root {
  --cc-primary-color: #your-color;
}
```

Widget JavaScript also applies the primary color from config.

### Position

Set in config or initialization:
```javascript
position: 'bottom-left' // or 'bottom-right'
```

### Welcome Message

Set in dashboard → Widget Configuration → Welcome Message

### Widget Name

Set in dashboard → Widget Configuration → Widget Name

## Future Enhancements

### Planned Features

1. **User Authentication**
   - Login integration
   - Cloud message sync
   - Cross-device history

2. **Rich Messages**
   - Markdown support
   - Code snippets
   - Images/attachments

3. **Advanced Features**
   - Sentiment analysis
   - Language detection
   - Proactive messages
   - Satisfaction surveys

4. **Analytics**
   - Message tracking
   - User engagement metrics
   - Popular questions
   - Response quality

5. **Customization**
   - Custom CSS themes
   - Logo upload
   - Localization (i18n)
   - Custom fonts

## Troubleshooting

### Widget not loading

1. Check browser console for errors
2. Verify API key format (starts with `pk_live_`)
3. Check network tab for 404s
4. Ensure script tag is before `</body>`

### API errors (401)

1. Verify API key is correct
2. Check client status (active/paused)
3. Verify domain is in allowedDomains
4. Check CORS headers

### Messages not sending

1. Check network connectivity
2. Verify N8N webhook is configured
3. Check server logs for errors
4. Test with curl directly to API

### Styling conflicts

1. Widget uses high z-index (999999)
2. All styles are prefixed with `.cc-`
3. Consider using Shadow DOM (future)

## Support

For issues or questions:
- Check console logs
- Review server logs
- Test with widget-test.html
- Contact support with error details

## License

This widget is part of the Conference Chat Dashboard project.
