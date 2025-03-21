const fs = require('fs');
const path = require('path');

// Source file path (adjust as needed)
const sourceFile = path.resolve(__dirname, '../Bible_Chinese_CUVS.xml');

// Destination file path
const destFile = path.resolve(__dirname, 'Bible_Chinese_CUVS.xml');

try {
  if (fs.existsSync(sourceFile)) {
    fs.copyFileSync(sourceFile, destFile);
    console.log('Bible XML file copied to public directory successfully.');
  } else {
    console.error('Source Bible XML file not found:', sourceFile);
  }
} catch (err) {
  console.error('Error copying Bible XML file:', err);
} 