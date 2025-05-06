const targetUrlPatterns = [];
const visitRecords = {};

chrome.storage.local.get(['targetUrlPatterns', 'visitRecords'], (result) => {
  if (result.targetUrlPatterns) {
    targetUrlPatterns.push(...result.targetUrlPatterns);
  }
  if (result.visitRecords) {
    Object.assign(visitRecords, result.visitRecords);
  }
});

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) {
    const url = new URL(details.url);
    const currentOrigin = url.origin;
    const fullUrl = details.url;

    for (const pattern of targetUrlPatterns) {
      if (fullUrl.includes(pattern.urlPattern)) {
        const timestamp = new Date().toISOString();
        
        if (!visitRecords[pattern.urlPattern]) {
          visitRecords[pattern.urlPattern] = [];
        }
        visitRecords[pattern.urlPattern].push({
          url: fullUrl,
          timestamp: timestamp
        });
        
        chrome.storage.local.set({ visitRecords });
		
		/* Add code here... */
        console.log(`Matched pattern: ${pattern.urlPattern} at ${timestamp}`);
        
        if (pattern.executeAction === 'notification') {
          chrome.action.setBadgeText({ text: "! " });
          chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
          
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/sarahW.jpeg',
            title: "Hey Noah! It's me!",
            message: "I see you there. Opening Outlook...\nI hope to hear from you soon!"
          });
        }
        
        break;
      }
    }
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getPatterns") {
    sendResponse({ patterns: targetUrlPatterns });
  } 
  else if (message.action === "getRecords") {
    sendResponse({ records: visitRecords });
  }
  else if (message.action === "addPattern") {
    targetUrlPatterns.push(message.pattern);
    chrome.storage.local.set({ targetUrlPatterns });
    sendResponse({ success: true });
  }
  else if (message.action === "removePattern") {
    const index = targetUrlPatterns.findIndex(p => 
      p.urlPattern === message.urlPattern
    );
    if (index !== -1) {
      targetUrlPatterns.splice(index, 1);
      chrome.storage.local.set({ targetUrlPatterns });
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
  }
  else if (message.action === "clearRecords") {
    if (message.pattern) {
      delete visitRecords[message.pattern];
    } else {
      Object.keys(visitRecords).forEach(key => {
        visitRecords[key] = [];
      });
    }
    chrome.storage.local.set({ visitRecords });
    sendResponse({ success: true });
  }
  return true;
});
