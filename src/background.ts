// Keep track of tabs with repeat enabled
const repeatTabs = new Set<number>();

// Function to handle video repetition
function repeatVideo(tabId: number) {
  if (!repeatTabs.has(tabId)) return;

  try {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const video = document.querySelector('video');
        if (video) {
          // Force video to be ready to play from start
          video.currentTime = 0;
          video.pause();
          
          // Add a small delay before playing to ensure the video is ready
          setTimeout(() => {
            const playPromise = video.play();
            
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.error('Error playing video:', error);
                // Try playing again after a longer delay if first attempt fails
                setTimeout(() => {
                  video.play().catch(console.error);
                }, 500);
              });
            }
          }, 100);
        }
      }
    }).catch(error => {
      console.error('Error executing script:', error);
      if (chrome.runtime.lastError) {
        console.log('Extension context invalid:', chrome.runtime.lastError);
        repeatTabs.delete(tabId);
        return;
      }
      // Try again after a delay if script execution fails
      setTimeout(() => repeatVideo(tabId), 500);
    });
  } catch (error) {
    console.error('Error in repeatVideo:', error);
    repeatTabs.delete(tabId);
  }
}

// Function to ensure content script is loaded
async function ensureContentScript(tabId: number): Promise<boolean> {
  try {
    // First check if content script is already loaded
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        return window.hasOwnProperty('isRepeatEnabled');
      }
    });

    if (result?.result) {
      return true;
    }

    // If not loaded, inject the content script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });

    // Wait for script to initialize
    await new Promise(resolve => setTimeout(resolve, 200));
    return true;
  } catch (error) {
    console.error('Error ensuring content script:', error);
    return false;
  }
}

// Function to clean up tab state
function cleanupTab(tabId: number) {
  try {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // Call cleanup function if it exists
        const customWindow = window as any;
        if (customWindow.cleanup) {
          customWindow.cleanup();
        }
      }
    }).catch(console.error);
  } catch (error) {
    console.error('Error cleaning up tab:', error);
  }
  repeatTabs.delete(tabId);
}

// Function to check if URL is a YouTube video page
function isYouTubeVideoPage(url: string): boolean {
  return url.includes('youtube.com/watch') || url.includes('youtu.be/');
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && isYouTubeVideoPage(tab.url)) {
    try {
      // Get the current repeat state
      const result = await chrome.storage.sync.get(['repeatEnabled']);
      if (result.repeatEnabled) {
        repeatTabs.add(tabId);
        // Ensure content script is loaded
        const scriptLoaded = await ensureContentScript(tabId);
        if (scriptLoaded) {
          // Send the current state to the content script
          await chrome.tabs.sendMessage(tabId, {
            action: 'toggleRepeat',
            enabled: true
          });
        }
      }
    } catch (error) {
      console.error('Error in tab update handler:', error);
      cleanupTab(tabId);
    }
  }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  cleanupTab(tabId);
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'videoEnded' && sender.tab && sender.tab.id) {
    const tabId = sender.tab.id;
    if (repeatTabs.has(tabId)) {
      // Add a small delay to ensure the video element is ready
      setTimeout(() => {
        repeatVideo(tabId);
      }, 200);
    }
  }
}); 