// Ecouter le clic sur le bouton dans le popup
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('toggleBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleSidebar'});
        }
      });
    });
  }
});
