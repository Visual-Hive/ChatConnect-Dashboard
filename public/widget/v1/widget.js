/**
 * Conference Chat Widget
 * Embeddable chat widget for conference support
 * Version: 1.0.0
 */
(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.ConferenceChatWidget) {
    console.warn('Conference Chat Widget already initialized');
    return;
  }

  /**
   * Generate a UUID v4
   * @returns {string} UUID
   */
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Sanitize HTML to prevent XSS
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Format timestamp
   * @param {Date} date - Date to format
   * @returns {string} Formatted time
   */
  function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  /**
   * Main Widget Class
   */
  class ConferenceChatWidget {
    constructor(config) {
      this.config = {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl || window.location.origin + '/api/widget',
        primaryColor: config.primaryColor || '#3b82f6',
        position: config.position || 'bottom-right',
      };

      // State
      this.sessionId = this.getOrCreateSession();
      this.messages = this.loadMessages();
      this.isOpen = false;
      this.isTyping = false;
      this.widgetConfig = null;
      this.retryCount = 0;
      this.maxRetries = 3;

      // DOM elements
      this.container = null;
      this.button = null;
      this.chatWindow = null;
      this.messagesContainer = null;
      this.input = null;

      // Initialize
      this.init();
    }

    /**
     * Initialize the widget
     */
    async init() {
      try {
        // Load CSS
        this.loadCSS();
        
        // Fetch configuration
        await this.fetchConfig();
        
        // Create UI
        this.createUI();
        
        // Attach event listeners
        this.attachEventListeners();
        
        console.log('Conference Chat Widget initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Conference Chat Widget:', error);
        this.showError('Failed to load chat widget');
      }
    }

    /**
     * Load widget CSS
     */
    loadCSS() {
      if (document.getElementById('cc-widget-styles')) {
        return;
      }

      const link = document.createElement('link');
      link.id = 'cc-widget-styles';
      link.rel = 'stylesheet';
      link.href = this.config.baseUrl.replace('/api/widget', '/widget/v1/widget.css');
      document.head.appendChild(link);
    }

    /**
     * Get or create session ID
     */
    getOrCreateSession() {
      let sessionId = localStorage.getItem('cc-session-id');
      if (!sessionId) {
        sessionId = generateUUID();
        localStorage.setItem('cc-session-id', sessionId);
      }
      return sessionId;
    }

    /**
     * Load messages from localStorage
     */
    loadMessages() {
      try {
        const stored = localStorage.getItem('cc-messages');
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error('Failed to load messages:', error);
        return [];
      }
    }

    /**
     * Save messages to localStorage
     */
    saveMessages() {
      try {
        localStorage.setItem('cc-messages', JSON.stringify(this.messages));
      } catch (error) {
        console.error('Failed to save messages:', error);
      }
    }

    /**
     * Fetch widget configuration
     */
    async fetchConfig() {
      try {
        const response = await fetch(`${this.config.baseUrl}/config`, {
          method: 'GET',
          headers: {
            'x-api-key': this.config.apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Config fetch failed: ${response.status}`);
        }

        const data = await response.json();
        this.widgetConfig = data.widget;
        
        // Update config with fetched values
        this.config.primaryColor = this.widgetConfig.primaryColor;
        this.config.position = this.widgetConfig.position;
      } catch (error) {
        console.error('Failed to fetch config:', error);
        // Use defaults
        this.widgetConfig = {
          primaryColor: this.config.primaryColor,
          position: this.config.position,
          welcomeMessage: 'Hi! How can I help?',
          widgetName: 'Support',
        };
      }
    }

    /**
     * Create UI elements
     */
    createUI() {
      // Create container
      this.container = document.createElement('div');
      this.container.id = 'cc-widget-container';
      this.container.className = 'cc-widget';
      
      // Create button (minimized state)
      this.createButton();
      
      // Create chat window (expanded state)
      this.createChatWindow();
      
      // Add to DOM
      document.body.appendChild(this.container);
      
      // Apply position
      this.applyPosition();
      
      // Apply theme
      this.applyTheme();
    }

    /**
     * Create floating button
     */
    createButton() {
      this.button = document.createElement('button');
      this.button.className = 'cc-widget-button';
      this.button.innerHTML = `
        <svg class="cc-icon-chat" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <svg class="cc-icon-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      this.button.setAttribute('aria-label', 'Toggle chat');
      this.container.appendChild(this.button);
    }

    /**
     * Create chat window
     */
    createChatWindow() {
      this.chatWindow = document.createElement('div');
      this.chatWindow.className = 'cc-chat-window';
      
      // Header
      const header = document.createElement('div');
      header.className = 'cc-chat-header';
      header.innerHTML = `
        <div class="cc-chat-header-content">
          <h3 class="cc-chat-title">${sanitizeHTML(this.widgetConfig.widgetName)}</h3>
          <p class="cc-chat-subtitle">We're here to help</p>
        </div>
        <button class="cc-close-button" aria-label="Close chat">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
      
      // Messages container
      this.messagesContainer = document.createElement('div');
      this.messagesContainer.className = 'cc-messages';
      
      // Input container
      const inputContainer = document.createElement('div');
      inputContainer.className = 'cc-input-container';
      
      this.input = document.createElement('textarea');
      this.input.className = 'cc-input';
      this.input.placeholder = 'Type your message...';
      this.input.rows = 1;
      this.input.maxLength = 2000;
      
      const sendButton = document.createElement('button');
      sendButton.className = 'cc-send-button';
      sendButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      `;
      
      inputContainer.appendChild(this.input);
      inputContainer.appendChild(sendButton);
      
      // Assemble chat window
      this.chatWindow.appendChild(header);
      this.chatWindow.appendChild(this.messagesContainer);
      this.chatWindow.appendChild(inputContainer);
      
      this.container.appendChild(this.chatWindow);
      
      // Render existing messages
      this.renderMessages();
    }

    /**
     * Apply position styles
     */
    applyPosition() {
      const isRight = this.config.position === 'bottom-right';
      this.container.style.right = isRight ? '20px' : 'auto';
      this.container.style.left = isRight ? 'auto' : '20px';
    }

    /**
     * Apply theme colors
     */
    applyTheme() {
      document.documentElement.style.setProperty('--cc-primary-color', this.config.primaryColor);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
      // Toggle button
      this.button.addEventListener('click', () => this.toggleChat());
      
      // Close button
      const closeButton = this.chatWindow.querySelector('.cc-close-button');
      closeButton.addEventListener('click', () => this.toggleChat());
      
      // Send button
      const sendButton = this.chatWindow.querySelector('.cc-send-button');
      sendButton.addEventListener('click', () => this.sendMessage());
      
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

    /**
     * Toggle chat open/closed
     */
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

    /**
     * Send message
     */
    async sendMessage() {
      const message = this.input.value.trim();
      
      if (!message) {
        return;
      }
      
      if (message.length > 2000) {
        this.showError('Message is too long (max 2000 characters)');
        return;
      }
      
      // Clear input
      this.input.value = '';
      this.input.style.height = 'auto';
      
      // Add user message
      this.addMessage('user', message);
      
      // Show typing indicator
      this.showTyping();
      
      try {
        // Send to API
        const response = await this.sendToAPI(message);
        
        // Hide typing indicator
        this.hideTyping();
        
        // Add assistant response
        this.addMessage('assistant', response.response, response.sources);
        
        // Reset retry count on success
        this.retryCount = 0;
      } catch (error) {
        console.error('Failed to send message:', error);
        this.hideTyping();
        
        // Show error message
        if (error.message.includes('timeout')) {
          this.showError('Request timed out. Please try again.');
        } else if (error.message.includes('network')) {
          this.showError('Connection lost. Please check your internet.');
        } else {
          this.showError('Failed to send message. Please try again.');
        }
      }
    }

    /**
     * Send message to API
     */
    async sendToAPI(message) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      try {
        const response = await fetch(`${this.config.baseUrl}/chat`, {
          method: 'POST',
          headers: {
            'x-api-key': this.config.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
            sessionId: this.sessionId,
            metadata: {
              userAgent: navigator.userAgent,
              pageUrl: window.location.href,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `API error: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeout);
        
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        
        if (!navigator.onLine) {
          throw new Error('Network error - no internet connection');
        }
        
        throw error;
      }
    }

    /**
     * Add message to chat
     */
    addMessage(role, content, sources = null) {
      const message = {
        id: generateUUID(),
        role: role,
        content: content,
        sources: sources,
        timestamp: new Date().toISOString(),
      };
      
      this.messages.push(message);
      this.saveMessages();
      this.renderMessage(message);
      this.scrollToBottom();
    }

    /**
     * Render all messages
     */
    renderMessages() {
      this.messagesContainer.innerHTML = '';
      this.messages.forEach(message => this.renderMessage(message));
    }

    /**
     * Render a single message
     */
    renderMessage(message) {
      const messageEl = document.createElement('div');
      messageEl.className = `cc-message cc-message-${message.role}`;
      
      const bubble = document.createElement('div');
      bubble.className = 'cc-message-bubble';
      
      const content = document.createElement('div');
      content.className = 'cc-message-content';
      content.textContent = message.content;
      
      const time = document.createElement('div');
      time.className = 'cc-message-time';
      time.textContent = formatTime(new Date(message.timestamp));
      
      bubble.appendChild(content);
      bubble.appendChild(time);
      
      // Add sources if present
      if (message.sources && message.sources.length > 0) {
        const sourcesEl = document.createElement('div');
        sourcesEl.className = 'cc-message-sources';
        sourcesEl.innerHTML = '<div class="cc-sources-title">Sources:</div>';
        
        message.sources.forEach(source => {
          const sourceEl = document.createElement('div');
          sourceEl.className = 'cc-source-item';
          sourceEl.innerHTML = `
            <strong>${sanitizeHTML(source.title)}</strong>
            ${source.excerpt ? `<p>${sanitizeHTML(source.excerpt)}</p>` : ''}
          `;
          sourcesEl.appendChild(sourceEl);
        });
        
        bubble.appendChild(sourcesEl);
      }
      
      messageEl.appendChild(bubble);
      this.messagesContainer.appendChild(messageEl);
    }

    /**
     * Show typing indicator
     */
    showTyping() {
      if (this.isTyping) {
        return;
      }
      
      this.isTyping = true;
      
      const typingEl = document.createElement('div');
      typingEl.className = 'cc-typing-indicator';
      typingEl.innerHTML = `
        <div class="cc-typing-bubble">
          <span></span>
          <span></span>
          <span></span>
        </div>
      `;
      
      this.messagesContainer.appendChild(typingEl);
      this.scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    hideTyping() {
      this.isTyping = false;
      const typingEl = this.messagesContainer.querySelector('.cc-typing-indicator');
      if (typingEl) {
        typingEl.remove();
      }
    }

    /**
     * Show error message
     */
    showError(message) {
      const errorEl = document.createElement('div');
      errorEl.className = 'cc-error-message';
      errorEl.textContent = message;
      
      this.messagesContainer.appendChild(errorEl);
      this.scrollToBottom();
      
      setTimeout(() => {
        errorEl.remove();
      }, 5000);
    }

    /**
     * Scroll messages to bottom
     */
    scrollToBottom() {
      setTimeout(() => {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }, 100);
    }
  }

  /**
   * Auto-initialize from script tag
   */
  function autoInit() {
    const scripts = document.getElementsByTagName('script');
    const currentScript = scripts[scripts.length - 1];
    
    // Check for window.ConferenceChatConfig first
    if (window.ConferenceChatConfig) {
      window.ConferenceChatWidget = new ConferenceChatWidget(window.ConferenceChatConfig);
      return;
    }
    
    // Fallback to data attributes
    const apiKey = currentScript.getAttribute('data-api-key');
    const baseUrl = currentScript.getAttribute('data-base-url');
    const primaryColor = currentScript.getAttribute('data-color');
    const position = currentScript.getAttribute('data-position');
    
    if (!apiKey) {
      console.error('Conference Chat Widget: API key is required');
      return;
    }
    
    window.ConferenceChatWidget = new ConferenceChatWidget({
      apiKey: apiKey,
      baseUrl: baseUrl,
      primaryColor: primaryColor,
      position: position,
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
