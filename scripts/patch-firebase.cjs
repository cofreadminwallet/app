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

// Automatically synchronize version from src/config/version.ts into package.json and package-lock.json
try {
  const rootDir = path.resolve(__dirname, '..');
  const versionFilePath = path.join(rootDir, 'src', 'config', 'version.ts');
  if (fs.existsSync(versionFilePath)) {
    const versionContent = fs.readFileSync(versionFilePath, 'utf8');
    const match = versionContent.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (match && match[1]) {
      const cleanVersion = match[1].trim().replace(/^v/i, '');
      if (cleanVersion) {
        const pkgPath = path.join(rootDir, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          let changed = false;
          if (pkg.version !== cleanVersion) {
            pkg.version = cleanVersion;
            changed = true;
          }
          if ('buildNumber' in pkg) {
            delete pkg.buildNumber;
            changed = true;
          }
          if (changed) {
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
            console.log('[version-sync] Updated package.json version to ' + cleanVersion);
          }
        }

        const lockPath = path.join(rootDir, 'package-lock.json');
        if (fs.existsSync(lockPath)) {
          const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
          let lockChanged = false;
          if (lock.version !== cleanVersion) {
            lock.version = cleanVersion;
            lockChanged = true;
          }
          if (lock.packages && lock.packages[''] && lock.packages[''].version !== cleanVersion) {
            lock.packages[''].version = cleanVersion;
            lockChanged = true;
          }
          if (lockChanged) {
            fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
            console.log('[version-sync] Updated package-lock.json version to ' + cleanVersion);
          }
        }
      }
    }
  }
} catch (err) {
  console.warn('[version-sync] Notice syncing version:', err);
}

