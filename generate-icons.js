const sharp = require('sharp');
const fs = require('fs');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Ensure icons directory exists
if (!fs.existsSync('dist/icons')) {
  fs.mkdirSync('dist/icons');
}

// Generate icons in different sizes
const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  sharp('icons/icon.svg')
    .resize(size, size)
    .png()
    .toFile(`dist/icons/icon${size}.png`)
    .then(() => {
      console.log(`Generated ${size}x${size} icon`);
    })
    .catch(err => {
      console.error(`Error generating ${size}x${size} icon:`, err);
    });
}); 