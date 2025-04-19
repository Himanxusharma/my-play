# My Play - YouTube Video Repeater

A Chrome extension that allows you to repeat YouTube videos with a single click. Works even when you switch to other tabs!

## Features

- 🔄 One-click video repetition
- 🎵 Works in background tabs
- 💾 Saves your repeat preference
- 🚀 Fast and lightweight
- 🛡️ Handles extension updates gracefully

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/my-play.git
cd my-play
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` directory from this project

## Usage

1. Open any YouTube video
2. Click the extension icon in your browser toolbar
3. Toggle the "Repeat Video" switch
4. The video will now repeat automatically when it ends
5. Works even when you switch to other tabs!

## Development

### Project Structure

```
my-play/
├── src/
│   ├── background.ts    # Background script for handling video repetition
│   ├── content.ts       # Content script for YouTube page interaction
│   └── popup.ts         # Popup UI script
├── dist/                # Built extension files
├── icons/               # Extension icons
├── manifest.json        # Extension configuration
├── popup.html           # Popup UI
├── webpack.config.js    # Build configuration
└── package.json         # Project dependencies
```

### Building

```bash
npm run build
```

This will:
1. Generate the extension icons
2. Compile TypeScript files
3. Bundle the extension
4. Copy necessary files to the `dist` directory

### Technologies Used

- TypeScript
- Webpack
- Chrome Extension APIs
- HTML/CSS

## Troubleshooting

If you encounter any issues:

1. **Extension not working**
   - Make sure you're on a YouTube video page
   - Check if the extension is enabled in `chrome://extensions/`
   - Try reloading the extension

2. **Video not repeating**
   - Open the browser console (F12)
   - Check for any error messages
   - Make sure the repeat toggle is enabled

3. **Extension context invalidated**
   - This is normal when the extension updates
   - The extension should recover automatically
   - If not, try reloading the page

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to all contributors who have helped improve this extension
- Special thanks to the Chrome Extension development community