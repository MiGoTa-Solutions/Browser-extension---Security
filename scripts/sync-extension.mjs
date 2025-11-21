import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const shellDir = path.join(projectRoot, 'extension-shell'); 
const popupDir = path.join(shellDir, 'popup');

async function ensureDistExists() {
  try {
    const stats = await fs.stat(distDir);
    if (!stats.isDirectory()) {
      throw new Error();
    }
  } catch {
    throw new Error('dist/ not found. Run "npm run build" first.');
  }
}

async function emptyDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function copyRecursive(src, dest) {
  const entries = await fs.readdir(src, { withFileTypes: true });
  await fs.mkdir(dest, { recursive: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function syncExtension() {
  console.log('🔄 Starting Extension Sync...');
  await ensureDistExists();
  
  // Clean and Sync the Popup folder
  // This places background.js, content.js, and content-loader.js inside extension-shell/popup/
  console.log('📂 Syncing files to extension-shell/popup/ ...');
  await emptyDir(popupDir);
  await copyRecursive(distDir, popupDir);

  console.log('✨ Extension sync complete! Reload the extension in Chrome.');
}

syncExtension().catch((error) => {
  console.error('[sync-extension] Failed:', error.message);
  process.exit(1);
});