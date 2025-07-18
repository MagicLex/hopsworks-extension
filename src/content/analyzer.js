const ElementDetector = {
  targets: {
    productCard: { 
      patterns: ['.product', '.product-card', '.item', '[data-product]', '[itemtype*="Product"]'],
      validation: el => el.querySelector('img') && (el.querySelector('[class*="price"]') || el.textContent.match(/\$\d+/))
    },
    productId: {
      patterns: ['[data-product-id]', '[data-id]', '[data-sku]', '[id*="product"]'],
      extract: el => el.dataset.productId || el.dataset.id || el.dataset.sku || el.id
    },
    price: {
      patterns: ['.price', '.product-price', '[class*="price"]', '[data-price]'],
      validation: el => el.textContent.match(/[\$€£]\s*\d+([.,]\d+)?/) || el.dataset.price
    },
    title: {
      patterns: ['.product-title', '.product-name', 'h2', 'h3', '[itemprop="name"]'],
      validation: el => el.textContent.trim().length > 3
    },
    image: {
      patterns: ['img', '[data-image]', '.product-image img'],
      validation: el => el.src || el.dataset.image
    },
    addToCart: {
      patterns: ['[class*="add-to-cart"]', '[class*="add-cart"]', 'button[data-action="add"]', '[onclick*="cart"]'],
      validation: el => el.textContent.match(/add|cart|buy/i) || el.dataset.action === 'add'
    }
  },

  analyze() {
    const results = {};
    
    for (const [key, config] of Object.entries(this.targets)) {
      const detected = this.detectElement(config);
      if (detected) {
        results[key] = {
          selector: detected.selector,
          count: detected.elements.length,
          confidence: detected.confidence,
          sample: detected.sample
        };
      }
    }
    
    return results;
  },

  detectElement(config) {
    let bestMatch = null;
    let highestScore = 0;
    
    for (const pattern of config.patterns) {
      const elements = document.querySelectorAll(pattern);
      if (elements.length === 0) continue;
      
      let validCount = 0;
      let sample = null;
      
      for (const el of elements) {
        if (!config.validation || config.validation(el)) {
          validCount++;
          if (!sample) {
            sample = config.extract ? config.extract(el) : el.textContent.trim();
          }
        }
      }
      
      if (validCount > 0) {
        const score = validCount / elements.length;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = {
            selector: pattern,
            elements: Array.from(elements).slice(0, validCount),
            confidence: score,
            sample: sample
          };
        }
      }
    }
    
    return bestMatch;
  },

  findOptimalSelector(elements) {
    if (!elements || elements.length === 0) return null;
    
    const firstEl = elements[0];
    
    if (firstEl.dataset.productId) return '[data-product-id]';
    if (firstEl.id && document.querySelectorAll(`#${firstEl.id}`).length === 1) return `#${firstEl.id}`;
    
    const classes = Array.from(firstEl.classList)
      .filter(c => !c.match(/active|hover|selected/))
      .sort((a, b) => a.length - b.length);
    
    for (const className of classes) {
      const selector = `.${className}`;
      const found = document.querySelectorAll(selector);
      if (found.length === elements.length) {
        return selector;
      }
    }
    
    let current = firstEl;
    let path = [];
    while (current && current !== document.body) {
      if (current.id) {
        path.unshift(`#${current.id}`);
        break;
      }
      const tag = current.tagName.toLowerCase();
      const index = Array.from(current.parentNode.children).indexOf(current);
      path.unshift(index > 0 ? `${tag}:nth-child(${index + 1})` : tag);
      current = current.parentNode;
    }
    
    return path.join(' > ');
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyze') {
    const results = ElementDetector.analyze();
    sendResponse(results);
  }
  return true;
});