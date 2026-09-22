const path = require('node:path');
module.exports = {
  appId: 'kr.ch2ch.management-client',
  productName: 'CH2CH 관리앱',
  electronVersion: require('../node_modules/electron/package.json').version,
  electronDist: path.dirname(require('electron')),
  directories: { app: __dirname, output: path.resolve(__dirname, '../.local-runtime/releases/windows-client') },
  files: ['main.js', 'preload.js', 'policy.js', 'setup.html', 'setup.css', 'setup.js', 'package.json', '!node_modules/**/*', '!**/.env*'],
  asar: true,
  extraResources: [],
  extraFiles: [],
  npmRebuild: false,
  win: { target: [{ target: 'nsis', arch: ['x64'] }], executableName: 'CH2CH-Client', signAndEditExecutable: false },
  nsis: { oneClick: false, perMachine: false, allowElevation: false, allowToChangeInstallationDirectory: true, runAfterFinish: false, createDesktopShortcut: true, shortcutName: 'CH2CH 관리앱' },
  artifactName: 'CH2CH-Client-Setup-${version}-${arch}.${ext}',
  publish: null
};
