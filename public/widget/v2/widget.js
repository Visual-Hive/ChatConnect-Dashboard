/**
 * ChatConnect Widget v2
 * 
 * Embeddable chat widget with SSE streaming support
 * 
 * Usage:
 * <script>
 *   window.ChatConnectConfig = {
 *     apiKey: 'pk_live_xxx',
 *     baseUrl: 'https://yoursite.com'  // optional
 *   };
 * </script>
 * <script src="https://yoursite.com/widget/v2/widget.js"></script>
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const CONFIG = window.ChatConnectConfig || window.ConferenceChatConfig || {};
  
  if (!CONFIG.apiKey) {
    console.error('ChatConnect: API key is required. Set window.ChatConnectConfig.apiKey');
    return;
  }

  const API_KEY = CONFIG.apiKey;
  const BASE_URL = CONFIG.baseUrl || window.location.origin;
  const WIDGET_API_URL = `${BASE_URL}/api/widget`;
  const STREAMING_ENABLED = CONFIG.streaming !== false; // Default to true

  // ============================================================================
  // UTILITIES
  // ============================================================================

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  // ============================================================================
  // STYLES
  // ============================================================================

  function injectStyles() {
    if (document.getElementById('chatconnect-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'chatconnect-styles';
    styles.textContent = `
      :root {
        --cc-primary-color: #3b82f6;
        --cc-primary-hover: #2563eb;
        --cc-text-color: #1f2937;
        --cc-bg-color: #ffffff;
        --cc-border-color: #e5e7eb;
        --cc-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .cc-widget-container {
        position: fixed;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      }

      .cc-widget-container.cc-bottom-right {
        bottom: 20px;
        right: 20px;
      }

      .cc-widget-container.cc-bottom-left {
        bottom: 20px;
        left: 20px;
      }

      .cc-widget-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: var(--cc-primary-color);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: var(--cc-shadow);
        transition: transform 0.2s, background-color 0.2s;
      }

      .cc-widget-button:hover {
        transform: scale(1.05);
        background-color: var(--cc-primary-hover);
      }

      .cc-widget-button svg {
        width: 28px;
        height: 28px;
        fill: white;
      }

      .cc-chat-window {
        position: absolute;
        bottom: 70px;
        width: 380px;
        height: 520px;
        background: var(--cc-bg-color);
        border-radius: 16px;
        box-shadow: var(--cc-shadow);
        display: none;
        flex-direction: column;
        overflow: hidden;
      }

      .cc-widget-container.cc-bottom-right .cc-chat-window {
        right: 0;
      }

      .cc-widget-container.cc-bottom-left .cc-chat-window {
        left: 0;
      }

      .cc-widget-container.cc-open .cc-chat-window {
        display: flex;
      }

      .cc-chat-header {
        background: var(--cc-primary-color);
        color: white;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .cc-chat-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .cc-close-button {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
      }

      .cc-close-button:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }

      .cc-messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .cc-message {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.5;
        animation: cc-fadeIn 0.3s ease;
      }

      @keyframes cc-fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .cc-message-user {
        align-self: flex-end;
        background-color: var(--cc-primary-color);
        color: white;
        border-bottom-right-radius: 4px;
      }

      .cc-message-assistant {
        align-self: flex-start;
        background-color: #f3f4f6;
        color: var(--cc-text-color);
        border-bottom-left-radius: 4px;
      }

      .cc-message-assistant.cc-streaming {
        background-color: #f0f9ff;
      }

      .cc-message-time {
        font-size: 10px;
        opacity: 0.7;
        margin-top: 4px;
      }

      .cc-message-sources {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        font-size: 12px;
      }

      .cc-message-sources summary {
        cursor: pointer;
        color: var(--cc-primary-color);
      }

      .cc-message-sources ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
      }

      .cc-message-sources li {
        margin-bottom: 4px;
      }

      .cc-typing-indicator {
        display: flex;
        gap: 4px;
        padding: 12px 16px;
        background-color: #f3f4f6;
        border-radius: 12px;
        align-self: flex-start;
        width: fit-content;
      }

      .cc-typing-indicator span {
        width: 8px;
        height: 8px;
        background-color: #9ca3af;
        border-radius: 50%;
        animation: cc-bounce 1.4s infinite ease-in-out both;
      }

      .cc-typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
      .cc-typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

      @keyframes cc-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }

      .cc-input-container {
        padding: 16px;
        border-top: 1px solid var(--cc-border-color);
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }

      .cc-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid var(--cc-border-color);
        border-radius: 20px;
        font-size: 14px;
        resize: none;
        max-height: 120px;
        font-family: inherit;
        line-height: 1.5;
      }

      .cc-input:focus {
        outline: none;
        border-color: var(--cc-primary-color);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }

      .cc-send-button {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: var(--cc-primary-color);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
        flex-shrink: 0;
      }

      .cc-send-button:hover:not(:disabled) {
        background-color: var(--cc-primary-hover);
      }

      .cc-send-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .cc-send-button svg {
        width: 20px;
        height: 20px;
        fill: white;
      }

      .cc-error {
        background-color: #fef2f2;
        color: #dc2626;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        margin: 8px 16px;
      }

      /* Mobile responsive */
      @media (max-width: 480px) {
        .cc-chat-window {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          border-radius: 0;
        }
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .cc-message, .cc-typing-indicator span {
          animation: none;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  // ============================================================================
  // WIDGET CLASS
  // ============================================================================

  class ChatConnectWidget {
    constructor() {
      this.isOpen = false;
      this.isStreaming = false;
      this.messages = [];
      this.sessionId = this.getOrCreateSessionId();
      this.widgetConfig = null;
      this.abortController = null;
      
      this.init();
    }

    getOrCreateSessionId() {
      const key = 'cc_session_id';
      let sessionId = localStorage.getItem(key);
      
      if (!sessionId) {
        sessionId = generateUUID();
        localStorage.setItem(key, sessionId);
      }
      
      return sessionId;
    }

    async init() {
      // Load saved messages
      this.loadMessages();
      
      // Fetch widget config
      await this.fetchConfig();
      
      // Inject styles
      injectStyles();
      
      // Create widget DOM
      this.createWidget();
      
      // Render existing messages
      this.renderMessages();
    }

    async fetchConfig() {
      try {
        const response = await fetch(`${WIDGET_API_URL}/config`, {
          headers: { 'x-api-key': API_KEY },
        });
        
        if (!response.ok) {
          throw new Error(`Config fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        this.widgetConfig = data.widget;
      } catch (error) {
        console.error('ChatConnect: Failed to fetch config:', error);
        // Use defaults
        this.widgetConfig = {
          primaryColor: '#3b82f6',
          position: 'bottom-right',
          welcomeMessage: 'Hi! How can I help?',
          widgetName: 'Support',
        };
      }
    }

    createWidget() {
      const container = document.createElement('div');
      container.className = `cc-widget-container cc-${this.widgetConfig.position}`;
      
      container.innerHTML = `
        <div class="cc-chat-window">
          <div class="cc-chat-header">
            <h3>${sanitizeHTML(this.widgetConfig.widgetName)}</h3>
            <button class="cc-close-button" aria-label="Close chat">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div class="cc-messages-container"></div>
          <div class="cc-input-container">
            <textarea 
              class="cc-input" 
              placeholder="Type a message..." 
              rows="1"
              aria-label="Message input"
            ></textarea>
            <button class="cc-send-button" aria-label="Send message">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
        <button class="cc-widget-button" aria-label="Open chat">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
        </button>
      `;
      
      document.body.appendChild(container);
      
      // Store references
      this.container = container;
      this.chatWindow = container.querySelector('.cc-chat-window');
      this.messagesContainer = container.querySelector('.cc-messages-container');
      this.input = container.querySelector('.cc-input');
      this.button = container.querySelector('.cc-widget-button');
      this.sendButton = container.querySelector('.cc-send-button');
      
      // Apply theme
      this.applyTheme();
      
      // Attach event listeners
      this.attachEventListeners();
    }

    applyTheme() {
      document.documentElement.style.setProperty(
        '--cc-primary-color', 
        this.widgetConfig.primaryColor
      );
    }

    attachEventListeners() {
      // Toggle button
      this.button.addEventListener('click', () => this.toggleChat());
      
      // Close button
      const closeButton = this.chatWindow.querySelector('.cc-close-button');
      closeButton.addEventListener('click', () => this.toggleChat());
      
      // Send button
      this.sendButton.addEventListener('click', () => this.sendMessage());
      
      // Input enter key
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
      
      // Auto-resize textarea
      this.input.addEventListener('input', () => {
        this.input.style.height = 'auto';
        this.input.style.height = Math.min(this.input.scrollHeight, 120) + 'px';
      });
    }

    toggleChat() {
      this.isOpen = !this.isOpen;
      this.container.classList.toggle('cc-open', this.isOpen);
      
      if (this.isOpen) {
        this.input.focus();
        this.scrollToBottom();
        
        // Show welcome message on first open
        if (this.messages.length === 0) {
          this.addMessage('assistant', this.widgetConfig.welcomeMessage);
        }
      }
    }

    async sendMessage() {
      const message = this.input.value.trim();
      
      if (!message || this.isStreaming) return;
      
      if (message.length > 2000) {
        this.showError('Message is too long (max 2000 characters)');
        return;
      }
      
      // Clear input
      this.input.value = '';
      this.input.style.height = 'auto';
      
      // Add user message
      this.addMessage('user', message);
      
      // Send to API
      if (STREAMING_ENABLED) {
        await this.sendStreamingMessage(message);
      } else {
        await this.sendNonStreamingMessage(message);
      }
    }

    async sendStreamingMessage(message) {
      this.isStreaming = true;
      this.sendButton.disabled = true;
      
      // Create placeholder for assistant message
      const assistantMessage = {
        id: generateUUID(),
        role: 'assistant',
        content: '',
        sources: null,
        timestamp: new Date().toISOString(),
      };
      this.messages.push(assistantMessage);
      this.renderStreamingMessage(assistantMessage);
      
      try {
        // Cancel any existing request
        if (this.abortController) {
          this.abortController.abort();
        }
        this.abortController = new AbortController();
        
        const response = await fetch(`${WIDGET_API_URL}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
          },
          body: JSON.stringify({
            message,
            sessionId: this.sessionId,
            metadata: {
              userAgent: navigator.userAgent,
              pageUrl: window.location.href,
            },
          }),
          signal: this.abortController.signal,
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              const eventType = line.slice(7);
              continue;
            }
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                break;
              }
              
              try {
                // Try parsing as JSON for sources/usage
                const parsed = JSON.parse(data);
                
                if (Array.isArray(parsed)) {
                  // Sources array
                  assistantMessage.sources = parsed;
                } else if (parsed.code) {
                  // Error
                  throw new Error(parsed.message);
                }
              } catch {
                // Plain text chunk
                assistantMessage.content += data;
                this.updateStreamingMessage(assistantMessage);
              }
            }
          }
        }
        
        // Finalize message
        this.finalizeStreamingMessage(assistantMessage);
        
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        
        console.error('ChatConnect: Stream error:', error);
        
        // Update message with error
        assistantMessage.content = 'Sorry, I encountered an error. Please try again.';
        this.updateStreamingMessage(assistantMessage);
        this.finalizeStreamingMessage(assistantMessage);
        
      } finally {
        this.isStreaming = false;
        this.sendButton.disabled = false;
        this.abortController = null;
      }
    }

    async sendNonStreamingMessage(message) {
      this.showTyping();
      
      try {
        const response = await fetch(`${WIDGET_API_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
          },
          body: JSON.stringify({
            message,
            sessionId: this.sessionId,
            metadata: {
              userAgent: navigator.userAgent,
              pageUrl: window.location.href,
            },
          }),
        });
        
        this.hideTyping();
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        this.addMessage('assistant', data.response, data.sources);
        
      } catch (error) {
        this.hideTyping();
        console.error('ChatConnect: Send error:', error);
        this.showError('Failed to send message. Please try again.');
      }
    }

    addMessage(role, content, sources = null) {
      const message = {
        id: generateUUID(),
        role,
        content,
        sources,
        timestamp: new Date().toISOString(),
      };
      
      this.messages.push(message);
      this.saveMessages();
      this.renderMessage(message);
      this.scrollToBottom();
    }

    renderMessage(message) {
      const el = document.createElement('div');
      el.className = `cc-message cc-message-${message.role}`;
      el.id = `cc-msg-${message.id}`;
      
      let html = `<div class="cc-message-content">${sanitizeHTML(message.content)}</div>`;
      
      if (message.sources && message.sources.length > 0) {
        html += `
          <div class="cc-message-sources">
            <details>
              <summary>Sources (${message.sources.length})</summary>
              <ul>
                ${message.sources.map(s => `<li>${sanitizeHTML(s.title)}</li>`).join('')}
              </ul>
            </details>
          </div>
        `;
      }
      
      html += `<div class="cc-message-time">${formatTime(message.timestamp)}</div>`;
      
      el.innerHTML = html;
      this.messagesContainer.appendChild(el);
    }

    renderStreamingMessage(message) {
      const el = document.createElement('div');
      el.className = `cc-message cc-message-assistant cc-streaming`;
      el.id = `cc-msg-${message.id}`;
      el.innerHTML = `<div class="cc-message-content">▌</div>`;
      this.messagesContainer.appendChild(el);
      this.scrollToBottom();
    }

    updateStreamingMessage(message) {
      const el = document.getElementById(`cc-msg-${message.id}`);
      if (el) {
        const content = el.querySelector('.cc-message-content');
        content.innerHTML = sanitizeHTML(message.content) + '▌';
        this.scrollToBottom();
      }
    }

    finalizeStreamingMessage(message) {
      const el = document.getElementById(`cc-msg-${message.id}`);
      if (el) {
        el.classList.remove('cc-streaming');
        
        let html = `<div class="cc-message-content">${sanitizeHTML(message.content)}</div>`;
        
        if (message.sources && message.sources.length > 0) {
          html += `
            <div class="cc-message-sources">
              <details>
                <summary>Sources (${message.sources.length})</summary>
                <ul>
                  ${message.sources.map(s => `<li>${sanitizeHTML(s.title)}</li>`).join('')}
                </ul>
              </details>
            </div>
          `;
        }
        
        html += `<div class="cc-message-time">${formatTime(message.timestamp)}</div>`;
        
        el.innerHTML = html;
      }
      
      this.saveMessages();
    }

    renderMessages() {
      this.messagesContainer.innerHTML = '';
      this.messages.forEach(message => this.renderMessage(message));
    }

    showTyping() {
      const existing = this.messagesContainer.querySelector('.cc-typing-indicator');
      if (existing) return;
      
      const el = document.createElement('div');
      el.className = 'cc-typing-indicator';
      el.innerHTML = '<span></span><span></span><span></span>';
      this.messagesContainer.appendChild(el);
      this.scrollToBottom();
    }

    hideTyping() {
      const el = this.messagesContainer.querySelector('.cc-typing-indicator');
      if (el) el.remove();
    }

    showError(message) {
      const el = document.createElement('div');
      el.className = 'cc-error';
      el.textContent = message;
      this.messagesContainer.appendChild(el);
      this.scrollToBottom();
      
      // Auto-remove after 5 seconds
      setTimeout(() => el.remove(), 5000);
    }

    scrollToBottom() {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    saveMessages() {
      try {
        // Only save last 50 messages
        const toSave = this.messages.slice(-50);
        localStorage.setItem('cc_messages', JSON.stringify(toSave));
      } catch (e) {
        console.warn('ChatConnect: Failed to save messages:', e);
      }
    }

    loadMessages() {
      try {
        const saved = localStorage.getItem('cc_messages');
        if (saved) {
          this.messages = JSON.parse(saved);
        }
      } catch (e) {
        console.warn('ChatConnect: Failed to load messages:', e);
        this.messages = [];
      }
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.ChatConnectWidget = new ChatConnectWidget();
    });
  } else {
    window.ChatConnectWidget = new ChatConnectWidget();
  }

})();
