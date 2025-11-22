# Web Access Lock Module Integration Guide

The previous (incomplete) Web Access Lock implementation was fully removed to let you drop in the completed module from your collaborator. This guide lists all touched areas and where to plug your production-ready code.

## Summary of Removals
- Frontend page `src/pages/WebAccessLock.tsx` deleted.
- Routes in `src/App.tsx` referencing `/wal` removed; default redirect now points to `/detect`.
- API layer: `tabLockApi` object removed from `src/services/api.ts`.
- Shared types: `TabLock` and related status types stripped from `src/types/index.ts` (placeholder comment left).
- Chrome Extension:
  - `src/extension/background.ts` replaced with a minimal placeholder service worker.
  - `src/extension/content.ts` replaced with a placeholder content script.
  - Lock-related helpers removed from `src/utils/chromeStorage.ts` (only auth token storage retained).
- Server backend:
  - `server/src/routes/tabLocks.ts` deleted and its mount removed from `server/src/app.ts`.
  - `tab_locks` table creation removed from `server/src/config/database.ts` (existing table is untouched; migrations now external responsibility).
  - Scripts `server/src/scripts/clear-locks.ts` and `server/src/scripts/setupDb.ts` deleted.
  - Types `server/src/types/tabLock.ts` deleted.

## Re‑Integration Checklist
When you receive the completed module, reintroduce functionality with these hooks:

### 1. Database / Migrations
Add migration logic (SQL or a migration tool) for the `tab_locks` table. Recommended locations:
- Create a new script in `server/src/migrations/` (e.g. `001_create_tab_locks.ts`).
- Call migration runner before server start (e.g. from `server/src/index.ts`).

### 2. Server Routes
Create a new router file: `server/src/routes/webAccessLock.ts` (or reuse original name). Export an Express router and mount in `server/src/app.ts`:
```ts
import webAccessLockRoutes from './routes/webAccessLock';
app.use('/api/locks', webAccessLockRoutes); // restore
```

### 3. Shared Types
Add a dedicated types file instead of modifying `src/types/index.ts` directly:
- Create `src/types/webAccessLock.ts` containing `TabLock`, `TabLockStatus`, and any payload interfaces.
- Optionally re-export from `src/types/index.ts` for convenience.

### 4. API Client
Reintroduce `tabLockApi` (or rename) inside `src/services/api.ts` or a new file `src/services/webAccessLockApi.ts`:
```ts
export const webAccessLockApi = {
  list: (token: string) => request<{ locks: TabLock[] }>("/locks", { token }),
  create: (token: string, data: CreateLockPayload) => request<{ lock: TabLock }>("/locks", { method: 'POST', token, data }),
  unlock: (token: string, id: number, pin: string) => request<{ lock: TabLock }>(`/locks/${id}/unlock`, { method: 'POST', token, data: { pin } }),
  // etc.
};
```

### 5. Extension Background Script
Replace placeholder in `src/extension/background.ts` with production logic:
- Token retrieval (`chrome.storage.local.get('auth_token')`).
- Periodic sync of locks.
- `UNLOCK_SITE` / `FORCE_SYNC` message handlers.
- Local cache write (reintroduce helpers removed from `chromeStorage.ts`).

### 6. Extension Content Script
Replace `src/extension/content.ts` placeholder with logic to:
- Detect current hostname against cached locked domains.
- Render overlay with PIN prompt.
- Send unlock message to background on success.
- Add anti-tamper observers (if still desired).

### 7. Chrome Storage Helpers
Restore removed helpers in `src/utils/chromeStorage.ts`:
- `updateLockCache(apiLocks)` building domain maps.
- `getLockForDomain(hostname)` for quick lookup.

### 8. Frontend Page
Add a new page component (e.g. `WebAccessLock.tsx`) under `src/pages/` with UI for:
- Listing locks.
- Creating locks.
- Unlocking/relocking/removing.
Add route back into `src/App.tsx`:
```tsx
<Route path="/wal" element={<ProtectedRoute><WebAccessLock /></ProtectedRoute>} />
```
Update redirects if you want `/wal` to be the default again.

### 9. Testing Strategy
- Unit test API client (mock `fetch`).
- Integration test server routes (Supertest) for lock lifecycle.
- Manual extension test: install unpacked build, verify overlay and unlock flow.

## Optional Improvements for New Module
- Use a migration framework (e.g. `umzug`, `knex`, or `prisma`).
- Add rate limiting for unlock attempts.
- Encrypt or hash PIN server-side (bcrypt or argon2) instead of plain storage.
- Emit structured logs (JSON) for background script sync events.
- Add metrics endpoint for lock counts.

## Removed Placeholder Locations
Search these markers when integrating:
- "Web Access Lock module removed" (background & content scripts)
- "webAccessLockApi" placeholder in `api.ts`
- Placeholder comment in `types/index.ts`
- Comment in `server/src/app.ts` for route mounting
- Comment in `server/src/config/database.ts` for schema responsibility

## Safe Rollback Plan
If you need to revert quickly:
1. Re-add original files from source control history (Git log for deleted paths).
2. Reinsert route mount and table creation code.
3. Rebuild extension (`npm run build` + sync script) and reload in Chrome.

## Final Notes
The removal was surgical: no unrelated modules were changed. All integration points are documented so you can drop in the completed module with minimal friction.

---
Prepared for smooth future integration.
