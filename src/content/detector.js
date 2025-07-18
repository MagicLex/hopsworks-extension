const UserDetector = {
  strategies: {
    explicit: {
      priority: 1,
      patterns: [
        { selector: '[data-user-id]', extract: el => el.dataset.userId },
        { selector: '[data-customer-id]', extract: el => el.dataset.customerId },
        { selector: '.user-id', extract: el => el.textContent.trim() },
        { selector: '#userId', extract: el => el.textContent.trim() },
        { selector: '[data-email]', extract: el => el.dataset.email }
      ]
    },
    
    javascript: {
      priority: 2,
      patterns: [
        'window.userId',
        'window.customerId',
        'window.user?.id',
        'window.currentUser?.id',
        'window.__USER__?.id',
        'window.Shopify?.customer?.id',
        'window._customer?.id',
        'window.dataLayer?.find(x => x.userId)?.userId'
      ]
    },
    
    storage: {
      priority: 3,
      cookies: ['user_id', 'userId', 'uid', 'customer_id', 'customerId', 'session_id', '_ga'],
      localStorage: ['user_id', 'userId', 'customer_id', 'customerId']
    },
    
    behavioral: {
      priority: 4,
      indicators: [
        { selector: '.logout, .sign-out', weight: 2 },
        { selector: '.my-account, .account-menu', weight: 1 },
        { selector: '[href*="account"]', weight: 1 },
        { text: 'Welcome back', weight: 2 }
      ]
    }
  },

  detect() {
    const results = [];
    
    for (const [strategy, config] of Object.entries(this.strategies)) {
      const detection = this[`detect${strategy.charAt(0).toUpperCase() + strategy.slice(1)}`](config);
      if (detection) {
        results.push({
          strategy,
          ...detection,
          priority: config.priority
        });
      }
    }
    
    results.sort((a, b) => a.priority - b.priority);
    
    const best = results[0] || { 
      strategy: 'anonymous', 
      confidence: 0, 
      code: this.generateAnonymousCode() 
    };
    
    return {
      method: best.strategy,
      value: best.value,
      confidence: best.confidence || 0,
      code: best.code,
      alternatives: results.slice(1)
    };
  },

  detectExplicit(config) {
    for (const pattern of config.patterns) {
      const el = document.querySelector(pattern.selector);
      if (el) {
        const value = pattern.extract(el);
        if (value) {
          return {
            value,
            confidence: 1.0,
            code: `document.querySelector('${pattern.selector}')?.${pattern.extract.toString().match(/el\.(\w+)/)?.[1] || 'textContent'}`
          };
        }
      }
    }
    return null;
  },

  detectJavascript(config) {
    for (const pattern of config.patterns) {
      try {
        const value = eval(pattern);
        if (value) {
          return {
            value,
            confidence: 0.8,
            code: pattern
          };
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  },

  detectStorage(config) {
    for (const name of config.cookies) {
      const match = document.cookie.match(new RegExp(`${name}=([^;]+)`));
      if (match) {
        return {
          value: match[1],
          confidence: 0.7,
          code: `document.cookie.match(/${name}=([^;]+)/)?.[1]`
        };
      }
    }
    
    for (const key of config.localStorage) {
      const value = localStorage.getItem(key);
      if (value) {
        return {
          value,
          confidence: 0.7,
          code: `localStorage.getItem('${key}')`
        };
      }
    }
    
    return null;
  },

  detectBehavioral(config) {
    let score = 0;
    const maxScore = config.indicators.reduce((sum, ind) => sum + ind.weight, 0);
    
    for (const indicator of config.indicators) {
      if (indicator.selector && document.querySelector(indicator.selector)) {
        score += indicator.weight;
      } else if (indicator.text && document.body.textContent.includes(indicator.text)) {
        score += indicator.weight;
      }
    }
    
    if (score > 0) {
      return {
        confidence: score / maxScore * 0.5,
        code: `// User appears to be logged in\n${this.generateAnonymousCode()}`
      };
    }
    
    return null;
  },

  generateAnonymousCode() {
    return `(function() {
  const id = localStorage.getItem('hw_anon_id');
  if (id) return id;
  const newId = 'anon_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('hw_anon_id', newId);
  return newId;
})()`;
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'detectUser') {
    const results = UserDetector.detect();
    sendResponse(results);
  }
  return true;
});