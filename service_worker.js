
chrome.tabs.onUpdated.addListener((tabId, status, tab) => {
    if (status.status !== 'complete') return;
    console.log(status)
    console.count('init')
    chrome.scripting.insertCSS({ target: { tabId }, files: ['./foreground.css'] });
    chrome.scripting.executeScript({ target: { tabId }, files: ['./foreground.js'] });
});

chrome.action.onClicked.addListener(tab => {
    chrome.tabs.sendMessage(tab.id, { cmd: 'start' });
});
