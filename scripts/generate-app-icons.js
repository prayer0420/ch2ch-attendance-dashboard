// Reproducible rasterization of the repo-owned vector; no external assets.
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../public/icons');
(async () => {
  for (const [file, size] of [['app-192.png', 192], ['app-512.png', 512], ['app-maskable-512.png', 512]]) {
    await sharp(path.join(root, 'app.svg')).resize(size, size).png().toFile(path.join(root, file));
  }
  console.log('App icons generated');
})().catch(error => { console.error(error); process.exitCode = 1; });
