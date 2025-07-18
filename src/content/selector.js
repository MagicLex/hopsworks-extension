const VisualSelector = {
  active: false,
  mode: null,
  selectedProduct: null,
  detectedSchema: {},
  callback: null,
  overlay: null,
  
  init(mode, callback) {
    this.mode = mode;
    this.callback = callback;
    this.active = true;
    this.selectedProduct = null;
    this.selectedElement = null;
    this.detectedSchema = {};
    
    this.createOverlay();
    this.attachListeners();
  },
  
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'hw-selector-overlay';
    this.overlay.innerHTML = `
      <style>
        #hw-selector-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999999;
          pointer-events: none;
        }
        
        #hw-page-dim {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          pointer-events: none;
          z-index: 999997;
        }
        
        #hw-selector-panel {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 320px;
          background: #000;
          color: #fff;
          border: 2px solid #1eb182;
          font-family: monospace;
          font-size: 12px;
          z-index: 999999;
          pointer-events: all;
          border-radius: 1px;
          cursor: move;
        }
        
        #hw-selector-panel h3 {
          background: #1eb182;
          color: #000;
          padding: 12px 16px;
          margin: 0;
          font-size: 14px;
          font-weight: bold;
          letter-spacing: 1px;
        }
        
        #hw-selector-panel .content {
          padding: 16px;
        }
        
        #hw-selector-panel .field {
          margin-bottom: 12px;
          padding: 8px;
          background: #111;
          border: 1px solid #333;
          border-radius: 1px;
        }
        
        #hw-selector-panel .field-label {
          font-weight: bold;
          color: #1eb182;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        #hw-selector-panel .field-value {
          color: #fff;
          margin-top: 4px;
          font-size: 11px;
          word-break: break-all;
        }
        
        #hw-selector-panel .field-value.empty {
          color: #666;
          font-style: italic;
        }
        
        #hw-selector-panel .actions {
          padding: 16px;
          border-top: 1px solid #333;
          display: flex;
          gap: 8px;
        }
        
        #hw-selector-panel button {
          flex: 1;
          background: #1eb182;
          color: #000;
          border: none;
          padding: 10px;
          cursor: pointer;
          font-family: inherit;
          font-weight: bold;
          font-size: 11px;
          text-transform: uppercase;
          border-radius: 1px;
        }
        
        #hw-selector-panel button:hover {
          background: #fff;
        }
        
        #hw-selector-panel button.secondary {
          background: #333;
          color: #fff;
        }
        
        #hw-selector-panel button.secondary:hover {
          background: #555;
        }
        
        #hw-selector-instructions {
          padding: 16px;
          background: #111;
          border-bottom: 1px solid #333;
          font-size: 11px;
          line-height: 1.6;
        }
        
        .hw-highlight {
          position: relative !important;
          z-index: 999998 !important;
          outline: 3px solid #1eb182 !important;
          outline-offset: 2px !important;
          cursor: pointer !important;
          background-color: rgba(30, 177, 130, 0.1) !important;
          pointer-events: all !important;
        }
        
        .hw-selected {
          position: relative !important;
          z-index: 999998 !important;
          outline: 4px solid #1eb182 !important;
          background-color: rgba(30, 177, 130, 0.2) !important;
          pointer-events: all !important;
        }
        
        .hw-schema-item {
          position: relative !important;
          z-index: 999998 !important;
          outline: 2px dashed #ff6b00 !important;
          outline-offset: 1px !important;
          pointer-events: all !important;
        }
        
        body.hw-selecting * {
          cursor: crosshair !important;
        }
      </style>
      <div id="hw-selector-panel">
        <h3>${this.mode === 'product' ? 'SELECT PRODUCT' : 'MANUAL SELECTION'}</h3>
        <div id="hw-selector-instructions" class="content">
          ${this.mode === 'product' 
            ? 'Click on any product card to auto-detect its schema (ID, price, title, etc.)'
            : `Select elements for: ${this.mode}`}
        </div>
        <div id="hw-detected-fields" class="content" style="display:none;">
          <div class="field">
            <div class="field-label">Product ID</div>
            <div class="field-value" id="hw-field-id">Not detected</div>
          </div>
          <div class="field">
            <div class="field-label">Title</div>
            <div class="field-value" id="hw-field-title">Not detected</div>
          </div>
          <div class="field">
            <div class="field-label">Price</div>
            <div class="field-value" id="hw-field-price">Not detected</div>
          </div>
          <div class="field">
            <div class="field-label">Image</div>
            <div class="field-value" id="hw-field-image">Not detected</div>
          </div>
          <div class="field">
            <div class="field-label">Add to Cart</div>
            <div class="field-value" id="hw-field-cart">Not detected</div>
          </div>
        </div>
        <div class="actions">
          <button id="hw-selector-confirm" style="display:none;">CONFIRM</button>
          <button id="hw-selector-cancel" class="secondary">CANCEL</button>
        </div>
      </div>
    `;
    
    // Create and insert dimmer first
    const dimmer = document.createElement('div');
    dimmer.id = 'hw-page-dim';
    document.body.appendChild(dimmer);
    
    // Then add overlay
    document.body.appendChild(this.overlay);
    document.body.classList.add('hw-selecting');
    
    document.getElementById('hw-selector-confirm').addEventListener('click', () => this.complete());
    document.getElementById('hw-selector-cancel').addEventListener('click', () => this.cancel());
    
    // Make panel draggable
    this.makeDraggable(document.getElementById('hw-selector-panel'));
  },
  
  attachListeners() {
    this.mouseMoveHandler = (e) => this.handleMouseMove(e);
    this.clickHandler = (e) => this.handleClick(e);
    this.keyHandler = (e) => this.handleKey(e);
    
    document.addEventListener('mousemove', this.mouseMoveHandler, true);
    document.addEventListener('click', this.clickHandler, true);
    document.addEventListener('keydown', this.keyHandler, true);
  },
  
  handleMouseMove(e) {
    if (!this.active || this.selectedProduct) return;
    
    const target = e.target;
    if (target.closest('#hw-selector-overlay') || target.id === 'hw-page-dim') return;
    
    document.querySelectorAll('.hw-highlight').forEach(el => {
      el.classList.remove('hw-highlight');
    });
    
    target.classList.add('hw-highlight');
  },
  
  handleClick(e) {
    if (!this.active) return;
    
    const target = e.target;
    
    if (target.closest('#hw-selector-overlay') || target.id === 'hw-page-dim') {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    if (this.mode === 'product') {
      this.selectProduct(target);
    } else {
      this.previewElement(target);
    }
    
    return false;
  },
  
  handleKey(e) {
    if (e.key === 'Escape') {
      this.cancel();
    }
  },
  
  selectProduct(element) {
    // Find the product container
    let productCard = element;
    while (productCard && productCard !== document.body) {
      // Check if this looks like a product card
      const hasImage = productCard.querySelector('img');
      const hasPrice = productCard.textContent.match(/[\$€£]\s*\d+/);
      const hasText = productCard.textContent.trim().length > 20;
      
      if (hasImage && hasPrice && hasText) {
        break;
      }
      productCard = productCard.parentElement;
    }
    
    if (!productCard || productCard === document.body) {
      alert('Please click on a complete product card');
      return;
    }
    
    // Clear previous highlights
    document.querySelectorAll('.hw-highlight, .hw-selected, .hw-schema-item').forEach(el => {
      el.classList.remove('hw-highlight', 'hw-selected', 'hw-schema-item');
    });
    
    this.selectedProduct = productCard;
    productCard.classList.add('hw-selected');
    
    // Infer schema
    this.detectedSchema = this.inferProductSchema(productCard);
    
    // Update UI
    document.getElementById('hw-selector-instructions').style.display = 'none';
    document.getElementById('hw-detected-fields').style.display = 'block';
    document.getElementById('hw-selector-confirm').style.display = 'block';
    
    // Show detected values
    this.updateFieldDisplay('id', this.detectedSchema.productId);
    this.updateFieldDisplay('title', this.detectedSchema.title);
    this.updateFieldDisplay('price', this.detectedSchema.price);
    this.updateFieldDisplay('image', this.detectedSchema.image);
    this.updateFieldDisplay('cart', this.detectedSchema.addToCart);
    
    // Highlight detected elements within the product
    Object.values(this.detectedSchema).forEach(item => {
      if (item && item.element && item.element !== productCard) {
        item.element.classList.add('hw-schema-item');
      }
    });
  },
  
  inferProductSchema(productCard) {
    const schema = {};
    
    // Product ID
    const idElement = productCard.querySelector('[data-product-id], [data-id], [data-sku]') || 
                     productCard.querySelector('[id*="product"]') ||
                     productCard;
    schema.productId = {
      element: idElement,
      value: idElement.dataset?.productId || idElement.dataset?.id || idElement.dataset?.sku || idElement.id,
      selector: this.generateSelector(idElement)
    };
    
    // Title
    const titleElement = productCard.querySelector('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"]');
    if (titleElement) {
      schema.title = {
        element: titleElement,
        value: titleElement.textContent.trim(),
        selector: this.generateSelector(titleElement)
      };
    }
    
    // Price
    const priceElement = Array.from(productCard.querySelectorAll('*')).find(el => {
      return el.textContent.match(/[\$€£]\s*\d+([.,]\d+)?/) && 
             !el.querySelector('*') && // leaf node
             (el.className.match(/price/i) || el.tagName.match(/SPAN|DIV/));
    });
    if (priceElement) {
      schema.price = {
        element: priceElement,
        value: priceElement.textContent.match(/[\$€£]\s*\d+([.,]\d+)?/)[0],
        selector: this.generateSelector(priceElement)
      };
    }
    
    // Image
    const imageElement = productCard.querySelector('img');
    if (imageElement) {
      schema.image = {
        element: imageElement,
        value: imageElement.src,
        selector: this.generateSelector(imageElement)
      };
    }
    
    // Add to cart button
    const cartButton = productCard.querySelector('button, [role="button"]') ||
                      Array.from(productCard.querySelectorAll('*')).find(el => {
                        return el.textContent.match(/add|cart|buy|shop/i) &&
                               (el.tagName === 'BUTTON' || el.tagName === 'A' || el.onclick);
                      });
    if (cartButton) {
      schema.addToCart = {
        element: cartButton,
        value: cartButton.textContent.trim(),
        selector: this.generateSelector(cartButton)
      };
    }
    
    return schema;
  },
  
  updateFieldDisplay(field, data) {
    const element = document.getElementById(`hw-field-${field}`);
    if (data && data.value) {
      element.textContent = data.value.substring(0, 50) + (data.value.length > 50 ? '...' : '');
      element.classList.remove('empty');
    } else {
      element.textContent = 'Not detected';
      element.classList.add('empty');
    }
  },
  
  generateSelector(element) {
    if (!element) return null;
    
    // Try data attributes first
    for (const attr of ['product-id', 'id', 'sku', 'product']) {
      if (element.dataset[attr]) return `[data-${attr}]`;
    }
    
    // Try ID
    if (element.id) return `#${element.id}`;
    
    // Try specific class
    const classes = Array.from(element.classList)
      .filter(c => !c.startsWith('hw-') && !c.match(/active|hover|focus/))
      .sort((a, b) => b.length - a.length); // prefer longer, more specific classes
    
    if (classes.length > 0) {
      return `.${classes[0]}`;
    }
    
    // Fallback to tag
    return element.tagName.toLowerCase();
  },
  
  previewElement(element) {
    // Clear previous selections
    document.querySelectorAll('.hw-selected').forEach(el => {
      el.classList.remove('hw-selected');
    });
    
    // Select this element
    element.classList.add('hw-selected');
    this.selectedElement = element;
    
    const selector = this.generateSelector(element);
    const similarCount = document.querySelectorAll(selector).length;
    
    // Update panel to show preview
    const panel = document.getElementById('hw-selector-panel');
    panel.innerHTML = `
      <h3 style="background: #1eb182; color: #000; padding: 12px 16px; margin: 0;">PREVIEW: ${this.mode.toUpperCase()}</h3>
      <div class="content" style="padding: 16px;">
        <div class="field">
          <div class="field-label">SELECTED ELEMENT</div>
          <div class="field-value">${element.tagName} - ${selector}</div>
        </div>
        <div class="field">
          <div class="field-label">VALUE</div>
          <div class="field-value" style="font-weight: bold;">${element.textContent.trim().substring(0, 50)}${element.textContent.length > 50 ? '...' : ''}</div>
        </div>
        <div class="field">
          <div class="field-label">SIMILAR ELEMENTS FOUND</div>
          <div class="field-value">${similarCount} total</div>
        </div>
        ${element.href ? `
        <div class="field">
          <div class="field-label">LINK</div>
          <div class="field-value" style="font-size: 10px;">${element.href}</div>
        </div>
        ` : ''}
      </div>
      <div class="actions" style="padding: 16px; border-top: 1px solid #333; display: flex; gap: 8px;">
        <button id="hw-validate-selection" style="flex: 1; background: #1eb182; color: #000; border: none; padding: 10px; cursor: pointer; font-family: inherit; font-weight: bold;">VALIDATE</button>
        <button id="hw-try-again" class="secondary" style="flex: 1; background: #333; color: #fff; border: none; padding: 10px; cursor: pointer; font-family: inherit;">TRY AGAIN</button>
      </div>
    `;
    
    // Add event listeners
    document.getElementById('hw-validate-selection').addEventListener('click', () => this.validateSelection());
    document.getElementById('hw-try-again').addEventListener('click', () => this.resetSelection());
  },
  
  validateSelection() {
    if (!this.selectedElement) return;
    
    const result = {
      selector: this.generateSelector(this.selectedElement),
      count: document.querySelectorAll(this.generateSelector(this.selectedElement)).length,
      elements: [this.selectedElement],
      sample: this.selectedElement.textContent.trim()
    };
    
    // Show success feedback
    const panel = document.getElementById('hw-selector-panel');
    panel.innerHTML = `
      <h3 style="background: #1eb182; color: #000; padding: 12px 16px; margin: 0;">SUCCESS!</h3>
      <div style="padding: 24px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
        <p style="font-size: 14px; margin-bottom: 16px;">Selection saved successfully!</p>
        <p style="font-size: 12px; color: #999;">${this.mode}: ${result.sample.substring(0, 30)}...</p>
      </div>
    `;
    
    // Wait a bit then cleanup
    setTimeout(() => {
      this.cleanup();
      if (this.callback) {
        this.callback(result);
      }
    }, 1500);
  },
  
  resetSelection() {
    // Clear selection and go back to initial state
    document.querySelectorAll('.hw-selected').forEach(el => {
      el.classList.remove('hw-selected');
    });
    
    this.selectedElement = null;
    
    // Reset panel
    const panel = document.getElementById('hw-selector-panel');
    panel.innerHTML = `
      <h3>${this.mode === 'product' ? 'SELECT PRODUCT' : 'MANUAL SELECTION'}</h3>
      <div id="hw-selector-instructions" class="content" style="padding: 16px; background: #111; border-bottom: 1px solid #333; font-size: 11px; line-height: 1.6;">
        Select elements for: ${this.mode}
      </div>
      <div class="actions" style="padding: 16px; border-top: 1px solid #333; display: flex; gap: 8px;">
        <button id="hw-selector-cancel" class="secondary" style="flex: 1; background: #333; color: #fff; border: none; padding: 10px; cursor: pointer; font-family: inherit;">CANCEL</button>
      </div>
    `;
    
    document.getElementById('hw-selector-cancel').addEventListener('click', () => this.cancel());
  },
  
  complete() {
    if (!this.selectedProduct && this.mode === 'product') {
      alert('No product selected');
      return;
    }
    
    // Show success feedback
    const panel = document.getElementById('hw-selector-panel');
    const originalContent = panel.innerHTML;
    
    panel.innerHTML = `
      <h3 style="background: #1eb182; color: #000; padding: 12px 16px; margin: 0;">SUCCESS!</h3>
      <div style="padding: 24px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
        <p style="font-size: 14px; margin-bottom: 16px;">Selection saved successfully!</p>
        <p style="font-size: 12px; color: #999;">Check the extension popup for results.</p>
      </div>
    `;
    
    // Build results
    let results;
    if (this.mode === 'product') {
      results = {
        productCard: {
          selector: this.generateSelector(this.selectedProduct),
          count: document.querySelectorAll(this.generateSelector(this.selectedProduct)).length,
          confidence: 1.0
        }
      };
      
      // Add detected schema fields
      Object.entries(this.detectedSchema).forEach(([key, data]) => {
        if (data && data.selector) {
          results[key] = {
            selector: data.selector,
            count: document.querySelectorAll(data.selector).length,
            confidence: 1.0,
            sample: data.value
          };
        }
      });
    }
    
    // Wait a bit then cleanup
    setTimeout(() => {
      this.cleanup();
      if (this.callback) {
        this.callback(results);
      }
    }, 1500);
  },
  
  cancel() {
    this.cleanup();
    if (this.callback) {
      this.callback(null);
    }
  },
  
  makeDraggable(element) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    const dragStart = (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
      
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === element || e.target.parentElement === element) {
        isDragging = true;
      }
    };

    const dragEnd = (e) => {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    };

    const drag = (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;

        element.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    };

    element.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
  },
  
  cleanup() {
    this.active = false;
    
    document.removeEventListener('mousemove', this.mouseMoveHandler, true);
    document.removeEventListener('click', this.clickHandler, true);
    document.removeEventListener('keydown', this.keyHandler, true);
    
    document.querySelectorAll('.hw-highlight, .hw-selected, .hw-schema-item').forEach(el => {
      el.classList.remove('hw-highlight', 'hw-selected', 'hw-schema-item');
    });
    
    document.body.classList.remove('hw-selecting');
    
    const dimmer = document.getElementById('hw-page-dim');
    if (dimmer) dimmer.remove();
    
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startSelection') {
    VisualSelector.init(request.targetType || 'product', (result) => {
      // Send result to background script instead of back to popup
      chrome.runtime.sendMessage({ 
        action: 'selectionComplete', 
        result: result 
      });
    });
    sendResponse({ status: 'started' });
    return true;
  }
});