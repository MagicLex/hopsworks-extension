chrome.runtime.onInstalled.addListener(() => {
  console.log('Hopsworks ML Integration Extension installed');
});

chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'selectionComplete') {
    handleSelectionComplete(request.result, sender.tab);
  }
});

async function handleSelectionComplete(result, tab) {
  // Get pending selection info
  const { pendingSelection } = await chrome.storage.local.get('pendingSelection');
  if (!pendingSelection) return;
  
  // Get current saved data
  const domain = new URL(tab.url).hostname;
  const storageKey = `hw_selection_${domain}`;
  const { [storageKey]: savedData } = await chrome.storage.local.get(storageKey);
  
  let detectionResults = savedData?.detectionResults || {};
  
  if (result) {
    // If product mode, update all fields
    if (pendingSelection.targetType === 'product' && result.productCard) {
      detectionResults = { ...detectionResults, ...result };
    } else {
      // Update single field
      detectionResults[pendingSelection.targetType] = {
        selector: result.selector,
        count: result.count,
        confidence: 1.0,
        sample: result.sample
      };
    }
    
    // Save updated results
    const data = {
      detectionResults: detectionResults,
      userDetection: savedData?.userDetection || { confidence: 0, method: 'anonymous', code: '' },
      timestamp: Date.now()
    };
    
    await chrome.storage.local.set({ 
      [storageKey]: data,
      'hw_last_domain': domain
    });
  }
  
  // Clear pending selection
  await chrome.storage.local.remove('pendingSelection');
  
  // Notify popup to refresh
  chrome.runtime.sendMessage({ action: 'refreshResults' });
}