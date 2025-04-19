document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('repeatToggle');
  
  // Load the saved state
  chrome.storage.sync.get(['repeatEnabled'], function(result) {
    toggle.checked = result.repeatEnabled || false;
  });

  // Function to send message to a tab
  async function sendMessageToTab(tab) {
    try {
      // First check if the tab is a YouTube tab
      if (!tab.url || !tab.url.includes('youtube.com')) {
        return;
      }

      // Try to send the message
      await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleRepeat',
        enabled: toggle.checked
      });
    } catch (error) {
      // If content script isn't loaded, inject it and try again
      if (error.message.includes('Receiving end does not exist')) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          // Wait a bit for the script to load
          await new Promise(resolve => setTimeout(resolve, 100));
          // Try sending the message again
          await chrome.tabs.sendMessage(tab.id, {
            action: 'toggleRepeat',
            enabled: toggle.checked
          });
        } catch (injectError) {
          console.log('Could not inject content script:', injectError);
        }
      } else {
        console.log('Error sending message to tab:', tab.id, error);
      }
    }
  }

  // Save the state when toggled
  toggle.addEventListener('change', async function() {
    const enabled = toggle.checked;
    chrome.storage.sync.set({ repeatEnabled: enabled });
    
    // Send message to all YouTube tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      await sendMessageToTab(tab);
    }
  });
}); 