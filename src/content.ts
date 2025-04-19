// Declare a custom property on window
const customWindow = window as Window & {
  isRepeatEnabled?: boolean;
  videoInterval?: number;
  cleanup?: () => void;
  skipStart?: number;
  skipEnd?: number;
};

let isRepeatEnabled = false;
let skipStart = 0;
let skipEnd = 0;
customWindow.isRepeatEnabled = isRepeatEnabled;
customWindow.skipStart = skipStart;
customWindow.skipEnd = skipEnd;

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
    
    // Ensure we're at the correct start position before replaying
    if (currentVideo) {
      currentVideo.currentTime = skipStart;
      // Add a small delay to ensure the video has time to seek
      setTimeout(() => {
        currentVideo?.play().catch(error => {
          console.error('Error playing video:', error);
        });
        isReplaying = false; // Reset replay state after starting playback
      }, 100);
    }
    
    sendVideoEndedMessage();
  }
}

// Function to handle time updates for more reliable end detection
function handleTimeUpdate() {
  if (!isRepeatEnabled || !currentVideo) return;
  
  // Check if we need to skip to start position
  if (currentVideo.currentTime < skipStart) {
    currentVideo.currentTime = skipStart;
  }
  
  // Check if we're very close to the end (accounting for skipEnd)
  const effectiveEnd = currentVideo.duration - skipEnd;
  if (currentVideo.currentTime >= effectiveEnd) {
    console.log('Reached effective end:', {
      currentTime: currentVideo.currentTime,
      duration: currentVideo.duration,
      skipEnd: skipEnd,
      effectiveEnd: effectiveEnd
    });
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
  
  currentVideo = video;
  
  if (isRepeatEnabled) {
    try {
      // Add both ended and timeupdate listeners for more reliable end detection
      video.addEventListener('ended', handleVideoEnd);
      video.addEventListener('timeupdate', handleTimeUpdate);
      
      // Set initial time if needed
      if (video.currentTime < skipStart) {
        video.currentTime = skipStart;
      }
      
      // Add seeking event listener to handle manual seeking
      video.addEventListener('seeking', () => {
        if (video.currentTime < skipStart) {
          video.currentTime = skipStart;
        }
        const effectiveEnd = video.duration - skipEnd;
        if (video.currentTime >= effectiveEnd) {
          video.currentTime = skipStart;
        }
      });
      
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
    setupVideoListener(video);
  }

  try {
    videoObserver = new MutationObserver((mutations) => {
      if (!isRepeatEnabled) return; // Check if still enabled
      const video = document.querySelector('video');
      if (video && video !== currentVideo) {
        console.log('New video element detected through observer');
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
      skipStart = message.skipStart || 0;
      skipEnd = message.skipEnd || 0;
      customWindow.isRepeatEnabled = isRepeatEnabled;
      customWindow.skipStart = skipStart;
      customWindow.skipEnd = skipEnd;
      
      if (!isRepeatEnabled) {
        cleanup(); // Clean up if disabled
      } else {
        const video = document.querySelector('video');
        setupVideoListener(video);
        monitorVideoChanges(); // Restart monitoring if enabled
      }
    } else if (message.action === 'updateSkipValues') {
      console.log('Received skip update:', message);
      skipStart = message.skipStart || 0;
      skipEnd = message.skipEnd || 0;
      customWindow.skipStart = skipStart;
      customWindow.skipEnd = skipEnd;
      
      // Update current video if exists
      if (currentVideo && isRepeatEnabled) {
        // If current time is before skipStart, move to skipStart
        if (currentVideo.currentTime < skipStart) {
          currentVideo.currentTime = skipStart;
        }
        // If current time is after effective end, move to skipStart
        const effectiveEnd = currentVideo.duration - skipEnd;
        if (currentVideo.currentTime >= effectiveEnd) {
          currentVideo.currentTime = skipStart;
        }
      }
    }
  } catch (error) {
    console.error('Error handling message:', error);
    cleanup();
  }
});

// Initialize the state when the page loads
try {
  chrome.storage.sync.get(['repeatEnabled', 'skipStart', 'skipEnd'], function(result) {
    isRepeatEnabled = result.repeatEnabled || false;
    skipStart = result.skipStart || 0;
    skipEnd = result.skipEnd || 0;
    customWindow.isRepeatEnabled = isRepeatEnabled;
    customWindow.skipStart = skipStart;
    customWindow.skipEnd = skipEnd;
    console.log('Initial state:', { isRepeatEnabled, skipStart, skipEnd });
    
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