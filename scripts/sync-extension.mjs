// scripts/sync-extension.mjs
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
// The root of the extension where manifest.json lives
const shellDir = path.join(projectRoot, 'extension-shell'); 
// The folder where the React App (popup) lives
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
  
  // 1. Clean and Sync the Popup folder (For the React UI)
  // This copies index.html, assets, and css
  console.log('📂 Syncing Popup files...');
  await emptyDir(popupDir);
  await copyRecursive(distDir, popupDir);

  // 2. Sync Background & Content Scripts to the ROOT (Critical Fix)
  // Chrome Manifest v3 usually expects these at the root level relative to manifest.json
  console.log('📜 Syncing Core Scripts to Root...');
  const scripts = ['background.js', 'content.js'];
  
  for (const script of scripts) {
    const src = path.join(distDir, script);
    const dest = path.join(shellDir, script);
    
    try {
      await fs.copyFile(src, dest);
      console.log(`   ✅ Updated: ${script}`);
    } catch (e) {
      console.warn(`   ⚠️ Warning: Could not copy ${script} to root (it might not exist in build).`);
    }
  }
  
  console.log('✨ Extension sync complete! Reload the extension in Chrome.');
}

syncExtension().catch((error) => {
  console.error('[sync-extension] Failed:', error.message);
  process.exit(1);
});