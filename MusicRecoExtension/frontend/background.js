chrome.action.onClicked.addListener((tab) => {
  // Check if current tab is SoundCloud
  if (tab.url && tab.url.includes("soundcloud.com")) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
  } else {
      // Check if any other tab is SoundCloud
      chrome.tabs.query({url: "*://*.soundcloud.com/*"}, (tabs) => {
          if (tabs && tabs.length > 0) {
              const scTab = tabs[0];
              chrome.tabs.update(scTab.id, {active: true});
              chrome.windows.update(scTab.windowId, {focused: true});
              chrome.tabs.sendMessage(scTab.id, { action: 'toggleSidebar' });
          } else {
              chrome.tabs.create({ url: "https://soundcloud.com" });
          }
      });
  }
});
