# SecureShield Extension Shell

This folder hosts a Chrome-compatible build that mirrors the main web app so you can test changes in the browser extension while keeping the web UI in rapid development mode.

## Workflow

1. Build the web app:
   ```bash
   npm run build
   ```
2. Copy the latest build artifacts into this shell:
   ```bash
   npm run sync-extension
   ```
3. In Chrome, open `chrome://extensions`, enable *Developer mode*, click **Load unpacked**, and select the `extension-shell` folder.
4. Keep iterating on the web app. When a feature is ready, rebuild and re-run `npm run sync-extension` to refresh the extension.

## Notes
-	The `popup/` directory will be populated with the contents of `dist/` (React build output) when you run the sync script.
-	Copy your icons into `extension-shell/icons` if you want custom branding; placeholder entries are provided.
-	Background and content scripts load from the copied assets when available, so keep building the corresponding bundles via Vite.
