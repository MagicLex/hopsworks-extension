chrome.runtime.onInstalled.addListener(() => {
  console.log('Hopsworks ML Integration Extension installed');
});

chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});