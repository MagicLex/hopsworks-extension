class ScriptViewer {
  constructor() {
    this.scriptContent = '';
    this.init();
  }
  
  async init() {
    // Get script from URL params or storage
    const params = new URLSearchParams(window.location.search);
    const fromStorage = params.get('storage');
    
    if (fromStorage) {
      // Load from storage
      const result = await chrome.storage.local.get(['hw_generated_script']);
      if (result.hw_generated_script) {
        this.scriptContent = result.hw_generated_script;
        this.displayScript();
      }
    }
    
    this.attachEventListeners();
  }
  
  displayScript() {
    const container = document.getElementById('scriptContent');
    
    // Wrap in script tags
    const fullScript = `<script>\n${this.scriptContent}\n</script>`;
    
    // Syntax highlight
    const highlighted = fullScript
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(&lt;script&gt;|&lt;\/script&gt;)/g, '<span class="script-tag">$1</span>')
      .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
      .replace(/('.*?'|".*?")/g, '<span class="string">$1</span>')
      .replace(/\b(function|const|let|var|if|else|return|new)\b/g, '<span class="keyword">$1</span>')
      .replace(/\b(window|document|chrome)\b/g, '<span class="function">$1</span>');
    
    container.innerHTML = highlighted;
    
    // Update info
    const lines = this.scriptContent.split('\n').length;
    const size = new Blob([fullScript]).size;
    document.getElementById('scriptInfo').textContent = 
      `${lines} lines • ${(size / 1024).toFixed(1)}KB • Ready to copy`;
  }
  
  attachEventListeners() {
    document.getElementById('copyFullBtn').addEventListener('click', () => this.copyScript());
    document.getElementById('downloadBtn').addEventListener('click', () => this.downloadScript());
    document.getElementById('closeBtn').addEventListener('click', () => window.close());
  }
  
  async copyScript() {
    const fullScript = `<script>\n${this.scriptContent}\n</script>`;
    
    try {
      await navigator.clipboard.writeText(fullScript);
      
      const btn = document.getElementById('copyFullBtn');
      const originalText = btn.textContent;
      btn.textContent = 'COPIED!';
      btn.style.background = '#1eb182';
      btn.style.color = '#000';
      
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.style.color = '';
      }, 2000);
      
      document.getElementById('scriptInfo').textContent = 'Script copied to clipboard!';
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }
  
  downloadScript() {
    const fullScript = `<script>\n${this.scriptContent}\n</script>`;
    const blob = new Blob([fullScript], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hopsworks-integration.js';
    a.click();
    
    URL.revokeObjectURL(url);
    
    document.getElementById('scriptInfo').textContent = 'Script downloaded!';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ScriptViewer();
});