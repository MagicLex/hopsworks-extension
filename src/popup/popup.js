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
  }

  initEventListeners() {
    document.getElementById('analyzeBtn').addEventListener('click', () => this.analyze());
    document.getElementById('generateBtn').addEventListener('click', () => this.showScriptScreen());
    document.getElementById('reanalyzeBtn').addEventListener('click', () => this.analyze());
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
      
      const [detectionResults, userResults] = await Promise.all([
        chrome.tabs.sendMessage(tab.id, { action: 'analyze' }),
        chrome.tabs.sendMessage(tab.id, { action: 'detectUser' })
      ]);
      
      this.detectionResults = detectionResults;
      this.userDetection = userResults;
      
      this.displayResults();
      this.showScreen('results');
    } catch (error) {
      console.error('Analysis failed:', error);
      this.showScreen('welcome');
      document.getElementById('status').textContent = 'ERROR';
      document.getElementById('status').style.background = '#ff0000';
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
      
      if (detection) {
        item.classList.add('success');
        item.innerHTML = `
          <strong>${label}:</strong>
          <span class="value">✓ ${detection.count} found</span>
          <span class="confidence">${Math.round(detection.confidence * 100)}%</span>
        `;
      } else {
        item.classList.add(required ? 'warning' : 'normal');
        item.innerHTML = `
          <strong>${label}:</strong>
          <span class="value">✗ Not detected</span>
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