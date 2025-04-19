let isRepeatEnabled = false;
let currentVideo = null;
let videoObserver = null;

// Function to handle video repetition
function handleVideoEnd() {
  console.log('Video ended, repeat enabled:', isRepeatEnabled);
  if (isRepeatEnabled) {
    const video = document.querySelector('video');
    if (video) {
      console.log('Resetting and playing video');
      video.currentTime = 0;
      // Add a small delay to ensure the video element is ready
      setTimeout(() => {
        video.play().catch(error => {
          console.log('Error playing video:', error);
        });
      }, 100);
    } else {
      console.log('No video element found');
    }
  }
}

// Function to setup video event listener
function setupVideoListener(video) {
  if (!video) return;
  
  console.log('Setting up video listener, repeat enabled:', isRepeatEnabled);
  
  // Remove any existing listeners first
  video.removeEventListener('ended', handleVideoEnd);
  
  if (isRepeatEnabled) {
    video.addEventListener('ended', handleVideoEnd);
  }
}

// Function to monitor video element changes
function monitorVideoChanges() {
  if (videoObserver) {
    videoObserver.disconnect();
  }

  videoObserver = new MutationObserver((mutations) => {
    const video = document.querySelector('video');
    if (video && video !== currentVideo) {
      console.log('New video element detected');
      currentVideo = video;
      setupVideoListener(video);
    }
  });

  videoObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  if (message.action === 'toggleRepeat') {
    isRepeatEnabled = message.enabled;
    console.log('Repeat toggled:', isRepeatEnabled);
    const video = document.querySelector('video');
    setupVideoListener(video);
  }
});

// Initialize the state when the page loads
chrome.storage.sync.get(['repeatEnabled'], function(result) {
  isRepeatEnabled = result.repeatEnabled || false;
  console.log('Initial repeat state:', isRepeatEnabled);
  
  // Start monitoring for video changes
  monitorVideoChanges();
  
  // Initial video setup
  const video = document.querySelector('video');
  if (video) {
    console.log('Initial video element found');
    currentVideo = video;
    setupVideoListener(video);
  }
}); 