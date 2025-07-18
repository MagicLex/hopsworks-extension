class PopupController {
  constructor() {
    this.screens = {
      welcome: document.getElementById('welcome'),
      analyzing: document.getElementById('analyzing'),
      results: document.getElementById('results'),
      script: document.getElementById('script')
    };
    
    this.detectionResults = null;
    this.userDetection = null;
    
    this.initEventListeners();
    this.loadSavedSelections();
    this.listenForUpdates();
  }

  initEventListeners() {
    document.getElementById('analyzeBtn').addEventListener('click', () => this.analyze());
    document.getElementById('generateBtn').addEventListener('click', () => this.showScriptScreen());
    document.getElementById('reanalyzeBtn').addEventListener('click', () => this.analyze());
    document.getElementById('clearBtn').addEventListener('click', () => this.clearSaved());
    document.getElementById('copyBtn').addEventListener('click', () => this.copyScript());
    document.getElementById('backBtn').addEventListener('click', () => this.showResultsScreen());
    
    document.getElementById('apiKey').addEventListener('input', () => this.regenerateScript());
  }

  showScreen(screenName) {
    Object.values(this.screens).forEach(screen => screen.classList.add('hidden'));
    this.screens[screenName].classList.remove('hidden');
  }

  async analyze() {
    this.showScreen('analyzing');
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if tab is valid
      if (!tab || !tab.id) {
        throw new Error('No active tab found');
      }
      
      // Check if URL is valid (not chrome:// pages)
      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://'))) {
        throw new Error('Cannot analyze Chrome system pages');
      }
      
      // Send messages with timeout
      const sendMessageWithTimeout = (tabId, message, timeout = 5000) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error('Message timeout'));
          }, timeout);
          
          chrome.tabs.sendMessage(tabId, message, (response) => {
            clearTimeout(timer);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      };
      
      const [detectionResults, userResults] = await Promise.all([
        sendMessageWithTimeout(tab.id, { action: 'analyze' }),
        sendMessageWithTimeout(tab.id, { action: 'detectUser' })
      ]);
      
      this.detectionResults = detectionResults || {};
      this.userDetection = userResults || { confidence: 0, method: 'anonymous', code: '' };
      
      // Save after detection
      await this.saveSelections();
      
      this.displayResults();
      this.showScreen('results');
      document.getElementById('status').textContent = 'READY';
      document.getElementById('status').style.background = '#1eb182';
    } catch (error) {
      console.error('Analysis failed:', error);
      
      // Show error in UI
      const errorMessage = error.message.includes('Chrome system pages') 
        ? 'Cannot analyze Chrome pages. Try on a real website.'
        : error.message.includes('timeout')
        ? 'Page not responding. Try refreshing.'
        : 'Analysis failed. Refresh page and try again.';
      
      this.showScreen('welcome');
      document.getElementById('status').textContent = 'ERROR';
      document.getElementById('status').style.background = '#ff0000';
      
      // Show error message
      const welcomeSection = document.getElementById('welcome');
      const existingError = welcomeSection.querySelector('.error-message');
      if (existingError) existingError.remove();
      
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.textContent = errorMessage;
      welcomeSection.insertBefore(errorDiv, welcomeSection.querySelector('button'));
    }
  }

  displayResults() {
    const container = document.getElementById('detectionResults');
    container.innerHTML = '';
    
    const elements = [
      { key: 'productCard', label: 'PRODUCTS', required: true },
      { key: 'productId', label: 'PRODUCT ID', required: true },
      { key: 'price', label: 'PRICE', required: true },
      { key: 'title', label: 'TITLE', required: false },
      { key: 'addToCart', label: 'CART BUTTON', required: true }
    ];
    
    elements.forEach(({ key, label, required }) => {
      const detection = this.detectionResults[key];
      const item = document.createElement('div');
      item.className = 'detection-item';
      item.dataset.key = key;
      
      if (detection) {
        item.classList.add('success');
        item.innerHTML = `
          <strong>${label}:</strong>
          <span class="value">✓ ${detection.count} found</span>
          <span class="confidence">${Math.round(detection.confidence * 100)}%</span>
          <button class="select-btn" data-target="${key}">↻</button>
        `;
      } else {
        item.classList.add(required ? 'warning' : 'normal');
        item.innerHTML = `
          <strong>${label}:</strong>
          <span class="value">✗ Not detected</span>
          <button class="select-btn" data-target="${key}">SELECT</button>
        `;
      }
      
      container.appendChild(item);
    });
    
    const userItem = document.createElement('div');
    userItem.className = 'detection-item';
    
    if (this.userDetection.confidence > 0.7) {
      userItem.classList.add('success');
      userItem.innerHTML = `
        <strong>USER ID:</strong>
        <span class="value">✓ ${this.userDetection.method}</span>
        <span class="confidence">${Math.round(this.userDetection.confidence * 100)}%</span>
      `;
    } else if (this.userDetection.confidence > 0) {
      userItem.classList.add('warning');
      userItem.innerHTML = `
        <strong>USER ID:</strong>
        <span class="value">⚠ ${this.userDetection.method}</span>
        <span class="confidence">${Math.round(this.userDetection.confidence * 100)}%</span>
      `;
    } else {
      userItem.innerHTML = `
        <strong>USER ID:</strong>
        <span class="value">Anonymous tracking</span>
      `;
    }
    
    container.appendChild(userItem);
    
    // Add click handlers for individual select buttons
    document.querySelectorAll('.select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetType = e.target.dataset.target;
        this.selectElement(targetType);
      });
    });
  }
  
  async selectElement(targetType) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Store the target type in storage so background script can handle it
    await chrome.storage.local.set({ 
      pendingSelection: { 
        targetType: targetType === 'productCard' ? 'product' : targetType,
        tabId: tab.id 
      } 
    });
    
    // Send message to start selection
    chrome.tabs.sendMessage(tab.id, { 
      action: 'startSelection', 
      targetType: targetType === 'productCard' ? 'product' : targetType 
    });
    
    // Don't close popup - let user see the selection happen
    // window.close();
  }
  
  async saveSelections() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const domain = new URL(tab.url).hostname;
    
    const data = {
      detectionResults: this.detectionResults,
      userDetection: this.userDetection,
      timestamp: Date.now()
    };
    
    chrome.storage.local.set({ 
      [`hw_selection_${domain}`]: data,
      'hw_last_domain': domain
    });
  }
  
  async loadSavedSelections() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;
    
    const domain = new URL(tab.url).hostname;
    const result = await chrome.storage.local.get([`hw_selection_${domain}`]);
    
    if (result[`hw_selection_${domain}`]) {
      const saved = result[`hw_selection_${domain}`];
      this.detectionResults = saved.detectionResults || {};
      this.userDetection = saved.userDetection || { confidence: 0, method: 'anonymous', code: '' };
      
      // Check if selections are recent (within 24 hours)
      if (Date.now() - saved.timestamp < 24 * 60 * 60 * 1000) {
        // If already on results screen, just refresh display
        if (!document.getElementById('results').classList.contains('hidden')) {
          this.displayResults();
          
          // Flash update indicator
          document.getElementById('status').textContent = 'UPDATED';
          document.getElementById('status').style.background = '#ff6b00';
          setTimeout(() => {
            document.getElementById('status').textContent = 'READY';
            document.getElementById('status').style.background = '#1eb182';
          }, 1000);
        } else {
          // Otherwise show results screen
          this.displayResults();
          this.showScreen('results');
          
          // Show persistence indicator
          document.getElementById('status').textContent = 'LOADED';
          document.getElementById('status').style.background = '#ff6b00';
          setTimeout(() => {
            document.getElementById('status').textContent = 'READY';
            document.getElementById('status').style.background = '#1eb182';
          }, 2000);
        }
      }
    }
  }
  
  listenForUpdates() {
    // Listen for refresh messages from background script
    chrome.runtime.onMessage.addListener((request) => {
      if (request.action === 'refreshResults') {
        console.log('Received refresh request, reloading selections...');
        // Reload saved selections and refresh display
        this.loadSavedSelections();
      }
    });
  }
  
  async clearSaved() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const domain = new URL(tab.url).hostname;
    
    await chrome.storage.local.remove([`hw_selection_${domain}`]);
    
    this.detectionResults = null;
    this.userDetection = null;
    
    // Re-analyze
    this.analyze();
  }

  showScriptScreen() {
    this.showScreen('script');
    this.regenerateScript();
  }

  showResultsScreen() {
    this.showScreen('results');
  }

  regenerateScript() {
    const apiKey = document.getElementById('apiKey').value || 'YOUR_API_KEY_HERE';
    
    const generator = new ScriptGenerator(this.detectionResults, this.userDetection, apiKey);
    const script = generator.generate();
    
    document.getElementById('generatedScript').textContent = script;
  }

  async copyScript() {
    const script = document.getElementById('generatedScript').textContent;
    
    try {
      await navigator.clipboard.writeText(script);
      
      const btn = document.getElementById('copyBtn');
      const originalText = btn.textContent;
      btn.textContent = 'COPIED!';
      btn.style.background = '#1eb182';
      btn.style.color = '#000';
      
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.style.color = '';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

class ScriptGenerator {
  constructor(detection, userDetection, apiKey) {
    this.detection = detection;
    this.userDetection = userDetection;
    this.apiKey = apiKey;
  }

  generate() {
    return `// Hopsworks ML Integration Script
// Generated on ${new Date().toISOString()}

(function() {
  // Configuration
  const config = {
    apiKey: '${this.apiKey}',
    userId: ${this.userDetection.code}
  };
  
  // Load Hopsworks SDK
  const script = document.createElement('script');
  script.src = 'https://cdn.hopsworks.ai/sdk/v1/hopsworks.min.js';
  script.onload = function() {
    // Initialize
    window.hopsworks.init({
      apiKey: config.apiKey,
      userId: config.userId
    });
    
    ${this.generateTracking()}
  };
  document.head.appendChild(script);
})();`;
  }

  generateTracking() {
    const parts = [];
    
    if (this.detection.productCard) {
      parts.push(`// Track product views
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const productId = el.dataset.productId || el.id;
          if (productId) {
            hopsworks.track('product_view', { productId });
          }
        }
      });
    });
    
    document.querySelectorAll('${this.detection.productCard.selector}').forEach(el => {
      observer.observe(el);
    });`);
    }
    
    if (this.detection.addToCart) {
      parts.push(`// Track add to cart
    document.addEventListener('click', function(e) {
      const button = e.target.closest('${this.detection.addToCart.selector}');
      if (button) {
        const productCard = button.closest('${this.detection.productCard?.selector || '[data-product]'}');
        if (productCard) {
          const productId = productCard.dataset.productId || productCard.id;
          hopsworks.track('add_to_cart', { productId });
        }
      }
    });`);
    }
    
    return parts.join('\n\n    ');
  }
}