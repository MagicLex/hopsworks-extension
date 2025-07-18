const VisualSelector = {
  active: false,
  currentTarget: null,
  selectedElements: new Set(),
  callback: null,
  overlay: null,
  
  init(targetType, callback) {
    this.targetType = targetType;
    this.callback = callback;
    this.active = true;
    this.selectedElements.clear();
    
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
        
        #hw-selector-ui {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #000;
          color: #fff;
          padding: 16px 24px;
          border: 1px solid #1eb182;
          font-family: monospace;
          font-size: 12px;
          z-index: 999999;
          pointer-events: all;
          border-radius: 1px;
        }
        
        #hw-selector-ui button {
          background: #1eb182;
          color: #000;
          border: none;
          padding: 8px 16px;
          margin-left: 16px;
          cursor: pointer;
          font-family: inherit;
          font-weight: bold;
          border-radius: 1px;
        }
        
        #hw-selector-ui button:hover {
          background: #fff;
        }
        
        .hw-highlight {
          outline: 2px solid #1eb182 !important;
          outline-offset: 2px !important;
          cursor: pointer !important;
        }
        
        .hw-selected {
          outline: 3px solid #1eb182 !important;
          background-color: rgba(30, 177, 130, 0.1) !important;
        }
        
        .hw-similar {
          outline: 2px dashed #1eb182 !important;
          outline-offset: 2px !important;
        }
        
        body.hw-selecting * {
          cursor: crosshair !important;
        }
      </style>
      <div id="hw-selector-ui">
        <span id="hw-selector-status">Click elements to select ${this.targetType}</span>
        <span id="hw-selector-count">0 selected</span>
        <button id="hw-selector-done">DONE</button>
        <button id="hw-selector-cancel">CANCEL</button>
      </div>
    `;
    
    document.body.appendChild(this.overlay);
    document.body.classList.add('hw-selecting');
    
    document.getElementById('hw-selector-done').addEventListener('click', () => this.complete());
    document.getElementById('hw-selector-cancel').addEventListener('click', () => this.cancel());
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
    if (!this.active) return;
    
    const target = e.target;
    if (target === this.currentTarget || target.closest('#hw-selector-overlay')) return;
    
    if (this.currentTarget) {
      this.currentTarget.classList.remove('hw-highlight');
    }
    
    this.currentTarget = target;
    target.classList.add('hw-highlight');
  },
  
  handleClick(e) {
    if (!this.active) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.target;
    if (target.closest('#hw-selector-overlay')) return;
    
    if (this.selectedElements.has(target)) {
      this.deselectElement(target);
    } else {
      this.selectElement(target);
    }
    
    return false;
  },
  
  handleKey(e) {
    if (e.key === 'Escape') {
      this.cancel();
    }
  },
  
  selectElement(element) {
    element.classList.add('hw-selected');
    this.selectedElements.add(element);
    
    const selector = this.generateSelector(element);
    const similar = document.querySelectorAll(selector);
    
    if (similar.length > 1) {
      similar.forEach(el => {
        if (el !== element && !this.selectedElements.has(el)) {
          el.classList.add('hw-similar');
        }
      });
      
      if (confirm(`Found ${similar.length} similar elements. Select all?`)) {
        similar.forEach(el => {
          el.classList.remove('hw-similar');
          el.classList.add('hw-selected');
          this.selectedElements.add(el);
        });
      } else {
        similar.forEach(el => el.classList.remove('hw-similar'));
      }
    }
    
    this.updateCount();
  },
  
  deselectElement(element) {
    element.classList.remove('hw-selected');
    this.selectedElements.delete(element);
    this.updateCount();
  },
  
  updateCount() {
    document.getElementById('hw-selector-count').textContent = `${this.selectedElements.size} selected`;
  },
  
  generateSelector(element) {
    const candidates = [];
    
    if (element.id) {
      candidates.push(`#${element.id}`);
    }
    
    const classes = Array.from(element.classList)
      .filter(c => !c.startsWith('hw-') && !c.match(/active|hover|focus/));
    
    if (classes.length > 0) {
      candidates.push(`.${classes[0]}`);
      if (classes.length > 1) {
        candidates.push(`.${classes.join('.')}`);
      }
    }
    
    if (element.dataset.productId) candidates.push('[data-product-id]');
    if (element.dataset.product) candidates.push('[data-product]');
    
    candidates.push(element.tagName.toLowerCase());
    
    for (const selector of candidates) {
      const matches = document.querySelectorAll(selector);
      if (matches.length > 0 && matches.length < 100) {
        const hasElement = Array.from(matches).includes(element);
        if (hasElement) return selector;
      }
    }
    
    return element.tagName.toLowerCase();
  },
  
  complete() {
    if (this.selectedElements.size === 0) {
      alert('No elements selected');
      return;
    }
    
    const firstElement = Array.from(this.selectedElements)[0];
    const selector = this.generateSelector(firstElement);
    
    const result = {
      selector: selector,
      count: this.selectedElements.size,
      elements: Array.from(this.selectedElements),
      sample: this.extractSample(firstElement)
    };
    
    this.cleanup();
    
    if (this.callback) {
      this.callback(result);
    }
  },
  
  extractSample(element) {
    if (this.targetType === 'productId') {
      return element.dataset.productId || element.id || element.textContent.trim();
    } else if (this.targetType === 'price') {
      return element.textContent.match(/[\$€£]\s*\d+([.,]\d+)?/)?.[0] || element.textContent.trim();
    } else {
      return element.textContent.trim();
    }
  },
  
  cancel() {
    this.cleanup();
    if (this.callback) {
      this.callback(null);
    }
  },
  
  cleanup() {
    this.active = false;
    
    document.removeEventListener('mousemove', this.mouseMoveHandler, true);
    document.removeEventListener('click', this.clickHandler, true);
    document.removeEventListener('keydown', this.keyHandler, true);
    
    document.querySelectorAll('.hw-highlight, .hw-selected, .hw-similar').forEach(el => {
      el.classList.remove('hw-highlight', 'hw-selected', 'hw-similar');
    });
    
    document.body.classList.remove('hw-selecting');
    
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startSelection') {
    VisualSelector.init(request.targetType, (result) => {
      sendResponse(result);
    });
    return true;
  }
});