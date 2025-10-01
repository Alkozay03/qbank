const fs = require('fs');
const path = require('path');

// Create directories if they don't exist
const backgroundDir = path.join(__dirname, 'public', 'backgrounds');
if (!fs.existsSync(backgroundDir)) {
  fs.mkdirSync(backgroundDir, { recursive: true });
  console.log('Created backgrounds directory');
}

// Note for the user to copy the image
console.log('\x1b[33m%s\x1b[0m', 'IMPORTANT: You need to manually copy the misty-blue.jpg image file to the public/backgrounds/ folder!');
console.log('Please add the image file to:', backgroundDir);
