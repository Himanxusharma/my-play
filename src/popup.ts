document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('repeatToggle') as HTMLInputElement;
  const status = document.getElementById('status');
  const statusContainer = document.getElementById('statusContainer');
  let statusTimeout: number;
  
  // Function to ensure content script is loaded
  async function ensureContentScript(tabId: number): Promise<boolean> {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.hasOwnProperty('isRepeatEnabled')
      });
      return true;
    } catch (error) {
      console.error('Error checking content script:', error);
      return false;
    }
  }

  // Function to inject content script
  async function injectContentScript(tabId: number): Promise<boolean> {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      return true;
    } catch (error) {
      console.error('Error injecting content script:', error);
      return false;
    }
  }

  // Function to check if current tab is a YouTube video page
  function isYouTubeVideoPage(url: string): boolean {
    return url.includes('youtube.com/watch') || url.includes('youtu.be/');
  }

  // Function to refresh the current tab
  async function refreshTab(tabId: number) {
    showStatus('Refreshing page...', '#666666');
    await chrome.tabs.reload(tabId);
    // Wait for page to load and try again
    setTimeout(async () => {
      const hasScript = await ensureContentScript(tabId);
      if (hasScript) {
        // Retry the toggle
        await chrome.tabs.sendMessage(tabId, {
          action: 'toggleRepeat',
          enabled: toggle.checked
        });
      }
    }, 1000);
  }
  
  // Load the saved state
  chrome.storage.sync.get(['repeatEnabled'], (result: { repeatEnabled?: boolean }) => {
    toggle.checked = result.repeatEnabled || false;
    updateStatus(result.repeatEnabled || false, false);
  });

  // Save the state when toggled
  toggle.addEventListener('change', async () => {
    const enabled = toggle.checked;
    
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.id || !tab.url || !isYouTubeVideoPage(tab.url)) {
        showStatus('Open a YouTube video first', '#dc3545');
        toggle.checked = !enabled; // Revert toggle
        return;
      }

      // Update UI immediately for better responsiveness
      updateStatus(enabled, true);
      
      // Save state
      chrome.storage.sync.set({ repeatEnabled: enabled });

      // Ensure content script is loaded
      let hasContentScript = await ensureContentScript(tab.id);
      if (!hasContentScript) {
        // Try to inject content script
        hasContentScript = await injectContentScript(tab.id);
        if (!hasContentScript) {
          // Instead of showing refresh message, refresh the page
          await refreshTab(tab.id);
          return;
        }
        // Wait for script to initialize
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Send message to content script
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'toggleRepeat',
          enabled: enabled
        });
      } catch (error) {
        console.error('Error sending message:', error);
        // If message fails, refresh the page
        await refreshTab(tab.id);
      }
    } catch (error) {
      console.error('Error toggling repeat:', error);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await refreshTab(tab.id);
      }
    }
  });

  // Function to show status temporarily
  function showStatus(message: string, color: string) {
    if (!status || !statusContainer) return;
    
    // Clear any existing timeout
    if (statusTimeout) {
      clearTimeout(statusTimeout);
    }
    
    status.textContent = message;
    status.style.color = color;
    status.classList.add('visible');
    statusContainer.classList.add('visible');
    
    // Hide status after 2 seconds
    statusTimeout = window.setTimeout(() => {
      status.classList.remove('visible');
      statusContainer.classList.remove('visible');
    }, 2000);
  }

  // Function to update status message
  function updateStatus(enabled: boolean, animate: boolean) {
    if (!status || !statusContainer) return;
    
    if (enabled) {
      showStatus('Repeat enabled', '#2ecc71');
    } else {
      showStatus('Repeat disabled', '#666666');
    }
    
    // If not animating, hide status immediately
    if (!animate) {
      status.classList.remove('visible');
      statusContainer.classList.remove('visible');
    }
  }
}); 