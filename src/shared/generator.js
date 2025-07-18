class ScriptGenerator {
  constructor(detection, userDetection, apiKey) {
    this.detection = detection;
    this.userDetection = userDetection;
    this.apiKey = apiKey;
  }

  generate() {
    return `
(function() {
  // Hopsworks ML Integration - Auto-generated script
  
  // Configuration
  const config = {
    apiKey: '${this.apiKey}',
    elements: ${JSON.stringify(this.detection, null, 2)},
    userId: ${this.userDetection.code}
  };
  
  // Load Hopsworks SDK
  const script = document.createElement('script');
  script.src = 'https://cdn.hopsworks.ai/sdk/v1/hopsworks.min.js';
  script.onload = function() {
    // Initialize Hopsworks
    window.hopsworks.init({
      apiKey: config.apiKey,
      userId: config.userId
    });
    
    // Track product views
    ${this.generateProductTracking()}
    
    // Track add to cart
    ${this.generateCartTracking()}
    
    // Inject recommendations
    ${this.generateRecommendationInjection()}
    
    // Progressive user identification
    ${this.generateProgressiveUserTracking()}
  };
  document.head.appendChild(script);
})();`;
  }

  generateProductTracking() {
    if (!this.detection.productCard) return '// No product cards detected';
    
    return `
    // Track product views
    const productObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const productId = ${this.generateExtractor('productId')};
          if (productId) {
            hopsworks.track('product_view', { productId });
          }
        }
      });
    });
    
    document.querySelectorAll('${this.detection.productCard.selector}').forEach(el => {
      productObserver.observe(el);
    });`;
  }

  generateCartTracking() {
    if (!this.detection.addToCart) return '// No add to cart buttons detected';
    
    return `
    // Track add to cart
    document.addEventListener('click', function(e) {
      const button = e.target.closest('${this.detection.addToCart.selector}');
      if (button) {
        const productCard = button.closest('${this.detection.productCard?.selector || '[data-product]'}');
        if (productCard) {
          const data = {
            productId: ${this.generateExtractor('productId', 'productCard')},
            price: ${this.generateExtractor('price', 'productCard')},
            title: ${this.generateExtractor('title', 'productCard')}
          };
          hopsworks.track('add_to_cart', data);
        }
      }
    });`;
  }

  generateRecommendationInjection() {
    if (!this.detection.productCard) return '// Cannot inject recommendations without product cards';
    
    return `
    // Inject recommendations
    hopsworks.getRecommendations({
      count: 4,
      context: 'product_page'
    }).then(recommendations => {
      // Find a good injection point
      const lastProduct = document.querySelector('${this.detection.productCard.selector}:last-of-type');
      if (!lastProduct) return;
      
      const container = lastProduct.parentElement;
      const recSection = document.createElement('div');
      recSection.className = 'hw-recommendations';
      recSection.innerHTML = '<h3>Recommended for you</h3><div class="hw-rec-grid"></div>';
      
      const grid = recSection.querySelector('.hw-rec-grid');
      recommendations.forEach(rec => {
        const card = this.createProductCard(rec);
        grid.appendChild(card);
      });
      
      container.appendChild(recSection);
    });`;
  }

  generateProgressiveUserTracking() {
    if (this.userDetection.confidence >= 0.8) {
      return '// User ID detection confidence is high - no progressive tracking needed';
    }
    
    return `
    // Progressive user identification
    const UserTracker = {
      upgrade: function(newId, method) {
        if (newId && newId !== config.userId) {
          hopsworks.identify(newId, {
            previousId: config.userId,
            method: method
          });
          config.userId = newId;
        }
      }
    };
    
    // Watch for email inputs
    document.addEventListener('blur', function(e) {
      if (e.target.type === 'email' && e.target.value) {
        UserTracker.upgrade(btoa(e.target.value.toLowerCase()), 'email');
      }
    }, true);
    
    // Periodic check for JS globals (SPAs)
    let checks = 0;
    const checkInterval = setInterval(function() {
      if (++checks > 10) {
        clearInterval(checkInterval);
        return;
      }
      const userId = ${this.userDetection.alternatives?.[0]?.code || 'null'};
      if (userId) {
        UserTracker.upgrade(userId, 'javascript');
        clearInterval(checkInterval);
      }
    }, 1000);`;
  }

  generateExtractor(field, context = 'el') {
    const detector = this.detection[field];
    if (!detector) return 'null';
    
    if (field === 'productId') {
      return `${context}.querySelector('[data-product-id]')?.dataset.productId || ${context}.id`;
    } else if (field === 'price') {
      return `${context}.querySelector('${detector.selector}')?.textContent.match(/[\\d.]+/)?.[0]`;
    } else if (field === 'title') {
      return `${context}.querySelector('${detector.selector}')?.textContent.trim()`;
    }
    
    return `${context}.querySelector('${detector.selector}')?.textContent`;
  }

  createProductCard(product) {
    // This would be injected into the page
    return `
    const card = document.createElement('div');
    card.className = '${this.detection.productCard?.selector.replace('.', '') || 'product-card'}';
    card.innerHTML = \`
      <img src="\${product.image}" alt="\${product.title}">
      <h3>\${product.title}</h3>
      <p class="${this.detection.price?.selector.replace('.', '') || 'price'}">\${product.price}</p>
      <button class="${this.detection.addToCart?.selector.replace('.', '') || 'add-to-cart'}">Add to Cart</button>
    \`;
    return card;`;
  }
}