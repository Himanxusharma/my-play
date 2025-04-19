# My Play - YouTube Video Repeater

A Chrome extension that allows you to easily repeat YouTube videos with customizable skip settings.

## Features

- 🔄 **One-Click Video Repeating**: Toggle video repetition with a single click
- ⏱️ **Customizable Skip Settings**:
  - Skip seconds from the start of the video
  - Skip seconds from the end of the video
  - Maximum skip limit of 600 seconds (10 minutes)
- 💾 **Settings Persistence**: Your repeat and skip settings are saved across sessions
- 🎯 **Precise Control**: Skip settings are applied immediately and work on both initial play and subsequent replays
- 🎨 **Clean Interface**: Simple and intuitive popup interface

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `dist` directory from this project

## Usage

1. Click the extension icon in your Chrome toolbar
2. Toggle the "Repeat Video" switch to enable/disable video repetition
3. Click "Skip Seconds" to configure:
   - Skip from start: Number of seconds to skip at the beginning of the video
   - Skip from end: Number of seconds to skip at the end of the video
4. Your settings will be automatically saved and applied to all YouTube videos

## Development

### Prerequisites

- Node.js
- npm

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load the `dist` directory in Chrome as described in the Installation section

### Project Structure

- `src/`: Source files
  - `content.ts`: Handles video control and skip functionality
  - `popup.ts`: Manages the popup interface and settings
  - `background.ts`: Handles background processes
- `popup.html`: Popup interface
- `manifest.json`: Extension configuration
- `icons/`: Extension icons

## License

MIT License

## Acknowledgments

- Thanks to all contributors who have helped improve this extension
- Special thanks to the Chrome Extension development community