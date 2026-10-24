const fs = require('fs');
const path = require('path');

const filesToPatch = [
  'node_modules/@firebase/auth/dist/esm/index-CvXU3_1x.js',
  'node_modules/@firebase/auth/dist/browser-cjs/index-DY73Er5u.js',
  'node_modules/@firebase/auth/dist/cordova/popup_redirect-D_ZWtJhY.js'
];

filesToPatch.forEach((relPath) => {
  const filePath = path.resolve(__dirname, '..', relPath);
  if (fs.existsSync(filePath)) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes("debugAssert(this.pendingPromise, 'Pending promise was never set');")) {
        content = content.replaceAll(
          "debugAssert(this.pendingPromise, 'Pending promise was never set');",
          "if (!this.pendingPromise) return;"
        );
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('[patch-firebase] Successfully patched: ' + relPath);
      }
    } catch (e) {
      console.warn('[patch-firebase] Notice patching ' + relPath + ':', e);
    }
  }
});
