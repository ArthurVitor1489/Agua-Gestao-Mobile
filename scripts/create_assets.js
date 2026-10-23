const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1x1 valid PNG in base64
const samplePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEeAFgYjQn3gAAAABJRU5ErkJggg==";
const samplePngBuffer = Buffer.from(samplePngBase64, 'base64');

fs.writeFileSync(path.join(assetsDir, 'icon.png'), samplePngBuffer);
fs.writeFileSync(path.join(assetsDir, 'splash.png'), samplePngBuffer);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), samplePngBuffer);

console.log('✅ Mobile app assets generated in assets/');
