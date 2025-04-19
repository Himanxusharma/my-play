// Declare a custom property on window
const customWindow = window as Window & {
  isRepeatEnabled?: boolean;
  videoInterval?: number;
  cleanup?: () => void;
};

let isRepeatEnabled = false;
customWindow.isRepeatEnabled = isRepeatEnabled;

let currentVideo: HTMLVideoElement | null = null;
let videoObserver: MutationObserver | null = null;
let retryCount = 0;
const MAX_RETRIES = 3;
let isReplaying = false;

// Cleanup function to remove all listeners and observers
function cleanup() {
  console.log('Cleaning up content script...');
  if (videoObserver) {
    videoObserver.disconnect();
    videoObserver = null;
  }
  
  if (currentVideo) {
    currentVideo.removeEventListener('ended', handleVideoEnd);
    currentVideo.removeEventListener('timeupdate', handleTimeUpdate);
    currentVideo = null;
  }

  if (customWindow.videoInterval) {
    clearInterval(customWindow.videoInterval);
    customWindow.videoInterval = undefined;
  }
  
  isReplaying = false;
}

// Store cleanup function on window for access during invalidation
customWindow.cleanup = cleanup;

// Function to handle video repetition
function handleVideoEnd() {
  if (isRepeatEnabled && !isReplaying) {
    console.log('Video ended, sending message to background script');
    retryCount = 0;
    isReplaying = true;
    sendVideoEndedMessage();
  }
}

// Function to handle time updates for more reliable end detection
function handleTimeUpdate() {
  if (!isRepeatEnabled || isReplaying || !currentVideo) return;
  
  // Check if we're very close to the end (within 0.5 seconds)
  if (currentVideo.currentTime >= currentVideo.duration - 0.5) {
    handleVideoEnd();
  }
}

// Function to send video ended message with retries
function sendVideoEndedMessage() {
  try {
    chrome.runtime.sendMessage({ action: 'videoEnded' }).catch(error => {
      if (chrome.runtime.lastError) {
        console.log('Extension context invalid, cleaning up:', chrome.runtime.lastError);
        cleanup();
        return;
      }
      console.error('Error sending message:', error);
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`Retrying message send (attempt ${retryCount})`);
        setTimeout(sendVideoEndedMessage, 100 * retryCount);
      } else {
        isReplaying = false; // Reset replay state if all retries fail
      }
    });
  } catch (error) {
    console.log('Extension context invalid, cleaning up:', error);
    cleanup();
  }
}

// Function to setup video event listener
function setupVideoListener(video: HTMLVideoElement | null) {
  if (!video) return;
  
  console.log('Setting up video listener for video:', video);
  
  // Remove any existing listeners first
  if (currentVideo) {
    currentVideo.removeEventListener('ended', handleVideoEnd);
    currentVideo.removeEventListener('timeupdate', handleTimeUpdate);
  }
  
  if (isRepeatEnabled) {
    try {
      // Add both ended and timeupdate listeners for more reliable end detection
      video.addEventListener('ended', handleVideoEnd);
      video.addEventListener('timeupdate', handleTimeUpdate);
      console.log('Added video event listeners');
    } catch (error) {
      console.error('Error setting up video listeners:', error);
    }
  }
}

// Function to monitor video element changes
function monitorVideoChanges() {
  if (videoObserver) {
    videoObserver.disconnect();
  }

  // First try to find the video element
  const video = document.querySelector('video');
  if (video && video !== currentVideo) {
    console.log('Found video element immediately');
    currentVideo = video;
    setupVideoListener(video);
  }

  try {
    videoObserver = new MutationObserver((mutations) => {
      if (!isRepeatEnabled) return; // Check if still enabled
      const video = document.querySelector('video');
      if (video && video !== currentVideo) {
        console.log('New video element detected through observer');
        currentVideo = video;
        setupVideoListener(video);
      }
    });

    videoObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });
  } catch (error) {
    console.error('Error setting up video observer:', error);
  }
}

// Function to initialize video monitoring
function initializeVideoMonitoring() {
  monitorVideoChanges();
  // Also periodically check for video element as backup
  customWindow.videoInterval = window.setInterval(() => {
    if (!isRepeatEnabled) return; // Check if still enabled
    try {
      const video = document.querySelector('video');
      if (video && video !== currentVideo) {
        console.log('Found video element through interval check');
        currentVideo = video;
        setupVideoListener(video);
      }
    } catch (error) {
      console.error('Error in interval check:', error);
    }
  }, 1000);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message) => {
  try {
    if (message.action === 'toggleRepeat') {
      console.log('Received toggle message:', message);
      isRepeatEnabled = message.enabled;
      customWindow.isRepeatEnabled = isRepeatEnabled;
      
      if (!isRepeatEnabled) {
        cleanup(); // Clean up if disabled
      } else {
        const video = document.querySelector('video');
        setupVideoListener(video);
        monitorVideoChanges(); // Restart monitoring if enabled
      }
    }
  } catch (error) {
    console.error('Error handling message:', error);
    cleanup();
  }
});

// Initialize the state when the page loads
try {
  chrome.storage.sync.get(['repeatEnabled'], function(result) {
    isRepeatEnabled = result.repeatEnabled || false;
    customWindow.isRepeatEnabled = isRepeatEnabled;
    console.log('Initial repeat state:', isRepeatEnabled);
    
    if (isRepeatEnabled) {
      // Initialize video monitoring
      initializeVideoMonitoring();
    }
  });
} catch (error) {
  console.error('Error initializing state:', error);
  cleanup();
}

// Handle cleanup when the extension is updated or unloaded
window.addEventListener('unload', cleanup); 