# Web Access Lock Module - Complete Workflow Specification

## Overview
The Web Access Lock module provides domain-level access control with PIN protection across both a web application and Chrome browser extension. Users can lock specific domains, requiring PIN verification before access is granted.

---

## System Architecture

### Components
1. **Web Application (React + Vite)**
   - Frontend UI for lock management
   - Runs on development server with API proxy
   
2. **Chrome Extension (Manifest V3)**
   - Service Worker (background script)
   - Content Scripts (injected into locked pages)
   - Chrome Storage API for lock caching
   
3. **Backend Server (Node.js + Express + MySQL)**
   - RESTful API for lock CRUD operations
   - Database persistence
   - Runs on http://localhost:4000

---

## Database Schema

### `tab_locks` table
```sql
- id (primary key, auto-increment)
- name (varchar) - Display name for the lock
- url (varchar) - Domain/URL pattern to lock
- pin (varchar) - Hashed PIN
- status (enum: 'locked', 'unlocked') - Current lock state
- created_at (timestamp)
- updated_at (timestamp)
- unlocked_at (timestamp, nullable)
- tabs (JSON array) - Associated tab information
```

---

## API Endpoints

### 1. Get All Locks
- **Endpoint**: `GET /api/locks`
- **Response**: Array of all lock objects
- **Used by**: Web app initial load, Extension background sync

### 2. Create Lock
- **Endpoint**: `POST /api/locks`
- **Body**: `{ name, url, pin }`
- **Response**: Created lock object with `status: 'locked'`
- **Used by**: Web app lock creation form

### 3. Unlock Site
- **Endpoint**: `POST /api/locks/:id/unlock`
- **Body**: `{ pin }`
- **Response**: Updated lock object with `status: 'unlocked'` and `unlocked_at` timestamp
- **Validation**: Compares provided PIN with stored hashed PIN
- **Used by**: Both web app and extension unlock flows

### 4. Delete Lock
- **Endpoint**: `DELETE /api/locks/:id`
- **Response**: Success confirmation
- **Used by**: Web app lock management

---

## Web Application Workflow

### Lock Creation Flow
1. User navigates to Web Access Lock page
2. User fills form: Lock Name, URL/Domain, PIN (with confirmation)
3. Frontend validates PIN match
4. Frontend sends `POST /api/locks` with form data
5. Backend hashes PIN, creates database record with `status: 'locked'`
6. Backend returns created lock object
7. Frontend updates UI to show new lock in list

### Lock Management Flow
1. On page load, fetch all locks via `GET /api/locks`
2. Display locks in table/list with status indicators
3. User can:
   - **View** lock details
   - **Unlock** by providing PIN → `POST /api/locks/:id/unlock`
   - **Delete** lock → `DELETE /api/locks/:id`
4. UI updates reflect database state changes

### Unlock from Web App Flow
1. User clicks "Unlock" button on a locked item
2. Modal/prompt appears requesting PIN
3. User enters PIN and submits
4. Frontend sends `POST /api/locks/:id/unlock` with PIN
5. Backend validates PIN against hash
6. If valid:
   - Database updates: `status = 'unlocked'`, `unlocked_at = NOW()`
   - Returns updated lock object
7. Frontend updates UI to show "Unlocked" status

---

## Chrome Extension Workflow

### Background Script Responsibilities
1. **Lock Synchronization**
   - Periodically fetch locks from `GET /api/locks`
   - Filter for `status: 'locked'` entries
   - Store in Chrome Storage API as `LockedDomainCache`
   - Format: `{ "hostname": { lockId: number, name: string } }`

2. **Message Handling**
   - Listen for messages from content scripts
   - Handle `UNLOCK_SITE` message type
   - Handle `VERIFY_PIN` message type (optional, for validation only)

3. **API Communication**
   - Use absolute URLs: `http://localhost:4000/api/locks`
   - Handle network errors gracefully
   - Log all API requests/responses for debugging

### Content Script Responsibilities
1. **Lock Detection**
   - On page load, extract current hostname
   - Read `LockedDomainCache` from Chrome Storage
   - Check if current hostname is in locked domains

2. **Overlay Injection**
   - If domain is locked, inject full-page overlay
   - Overlay contains:
     - Lock name/title
     - PIN input field
     - Unlock button
     - Error message area
   - Prevent access to underlying page content

3. **Unlock Request**
   - User enters PIN and clicks unlock
   - Send message to background script via `chrome.runtime.sendMessage`
   - Message payload: `{ type: 'UNLOCK_SITE', lockId: number, pin: string }`
   - Wait for response

### Extension Unlock Flow (Complete)

#### Step 1: Content Script Detection
1. Content script loads on every page
2. Reads current `window.location.hostname`
3. Reads `LockedDomainCache` from `chrome.storage.local`
4. If hostname exists in cache → proceed to overlay injection

#### Step 2: Overlay Display
1. Create full-page blocking overlay (z-index: 999999)
2. Display lock information from cache: `{ lockId, name }`
3. Show PIN input form
4. Attach event listener to unlock button

#### Step 3: User Interaction
1. User enters PIN in input field
2. User clicks "Unlock" button
3. Content script validates PIN is not empty

#### Step 4: Message to Background
1. Content script sends message:
```javascript
chrome.runtime.sendMessage({
  type: 'UNLOCK_SITE',
  lockId: number,    // from cache
  pin: string        // user input
}, (response) => {
  // Handle response
});
```

#### Step 5: Background Processing
1. Background script receives message
2. Validates message type is `UNLOCK_SITE`
3. Extracts `lockId` and `pin` from message
4. Calls API: `POST http://localhost:4000/api/locks/${lockId}/unlock`
5. Request body: `{ pin }`

#### Step 6: API Validation
1. Backend receives unlock request
2. Fetches lock record by `lockId` from database
3. Compares provided PIN with stored hash
4. If PIN matches:
   - Updates database: `status = 'unlocked'`, `unlocked_at = NOW()`
   - Returns updated lock object
5. If PIN invalid:
   - Returns 400/401 error with message

#### Step 7: Background Response Processing
1. Background script receives API response
2. If successful unlock:
   - Fetch updated locks list: `GET /api/locks`
   - Re-sync Chrome Storage (remove unlocked domain from cache)
   - Send success response to content script
3. If API error:
   - Parse error message
   - Send error response to content script

#### Step 8: Content Script Update
1. Content script receives response in callback
2. If success:
   - Remove overlay from DOM
   - Reload page to show unlocked content
   - User can now access the site
3. If error:
   - Display error message in overlay
   - Keep overlay visible
   - Allow user to retry with correct PIN

---

## Chrome Storage Structure

### `LockedDomainCache`
```typescript
{
  "example.com": {
    lockId: 123,
    name: "Example Lock"
  },
  "github.com": {
    lockId: 456,
    name: "GitHub Access Lock"
  }
}
```

**Purpose**: Fast domain lookup without API calls on every page load

**Sync Strategy**: 
- Background script refreshes every 30 seconds (or on extension startup)
- Content script reads on page load (cached, not live API)
- After unlock, background immediately re-syncs to remove unlocked domain

---

## Message Passing Protocol

### Message Types

#### 1. UNLOCK_SITE
- **Direction**: Content Script → Background Script
- **Payload**: 
```javascript
{
  type: 'UNLOCK_SITE',
  lockId: number,
  pin: string
}
```
- **Response**:
```javascript
// Success
{ success: true }

// Error
{ success: false, error: string }
```

#### 2. VERIFY_PIN (Optional)
- **Direction**: Content Script → Background Script
- **Payload**:
```javascript
{
  type: 'VERIFY_PIN',
  lockId: number,
  pin: string
}
```
- **Response**:
```javascript
{ valid: boolean }
```
- **Note**: This only validates PIN without changing lock status

---

## Environment Detection

### API URL Resolution
- **Web App Context**: Use relative URL `/api/locks` (proxied by Vite dev server to `http://localhost:4000`)
- **Extension Context**: Use absolute URL `http://localhost:4000/api/locks` (no proxy available)

### Detection Method
```javascript
function isExtensionContext() {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
}

const baseURL = isExtensionContext() 
  ? 'http://localhost:4000/api' 
  : '/api';
```

---

## Build System

### Vite Configuration
- **Entry Points**:
  - Main app: `index.html`
  - Background script: `public/background.ts` (or `src/extension/background.ts`)
  - Content script: `public/content.ts` (or `src/extension/content.ts`)

- **Build Output** (`dist/`):
  - `background.js` - Service worker
  - `content.js` - Content script
  - `index.html`, `main.js` - Web app

- **Extension Sync**:
  - Script: `scripts/sync-extension.mjs`
  - Copies `dist/` → `extension-shell/popup/`
  - Extension loads from `extension-shell/popup/`

### Build Commands
```bash
npm run build                    # Build all
node scripts/sync-extension.mjs  # Sync to extension
```

---

## Error Scenarios & Handling

### 1. Network Failure (Extension)
- **Scenario**: API server not running
- **Detection**: Fetch fails with network error
- **Handling**: 
  - Display error in overlay: "Cannot connect to server"
  - Suggest checking if server is running
  - Do not remove overlay
  - Log error to console

### 2. Invalid PIN
- **Scenario**: User enters wrong PIN
- **Detection**: API returns 400/401 status
- **Handling**:
  - Display error: "Invalid PIN"
  - Keep overlay visible
  - Clear PIN input
  - Allow retry

### 3. Lock Already Unlocked
- **Scenario**: Lock was unlocked from web app while extension overlay is showing
- **Detection**: API returns success but lock was already unlocked
- **Handling**:
  - Treat as success
  - Remove overlay
  - Reload page

### 4. Message Delivery Failure
- **Scenario**: Content script sends message but background script not responding
- **Possible Causes**:
  - Service worker sleeping/inactive
  - Extension context invalidated (extension reloaded)
  - Message listener not registered
- **Handling**:
  - Implement timeout on message response (5 seconds)
  - Display error: "Extension communication error"
  - Suggest reloading extension

### 5. Chrome Storage Sync Failure
- **Scenario**: Background cannot write to chrome.storage
- **Detection**: `chrome.runtime.lastError` set
- **Handling**:
  - Log error to console
  - Continue operation (lock state in database is source of truth)
  - Retry sync on next interval

---

## Security Considerations

### PIN Storage
- Never store plain-text PINs
- Backend hashes PINs before database storage
- Use bcrypt or similar hashing algorithm
- Validate PIN strength on creation

### Extension Security
- Content scripts run in isolated world
- Service worker has elevated permissions
- Validate all messages from content scripts
- Sanitize user input before API calls

### CORS Configuration
- Backend must allow requests from extension origin
- Extension manifest must declare host permissions
- Development: Allow localhost origins

---

## Testing Strategy

### Unit Tests
- API endpoint validation
- PIN hashing/verification
- Message handler logic

### Integration Tests
- Full unlock flow: Web app → Backend → Database
- Full unlock flow: Extension → Background → Backend → Storage sync
- Lock creation → Extension sync → Content detection

### Manual Testing Checklist
1. Create lock via web app → verify in database
2. Navigate to locked domain in Chrome → verify overlay appears
3. Enter correct PIN → verify overlay removes and page loads
4. Enter wrong PIN → verify error message
5. Unlock via web app → verify extension overlay no longer appears
6. Delete lock → verify extension no longer blocks domain

---

## Known Issues to Resolve

### Issue 1: Message Not Reaching Background
- **Symptom**: Content script sends message, no logs in background console
- **Possible Causes**:
  - Wrong background script file being compiled (public/ vs src/extension/)
  - Service worker not registered or sleeping
  - Message listener not properly set up
  - Extension context invalidated

### Issue 2: State Synchronization Delay
- **Symptom**: Extension shows stale lock status
- **Solution**: Implement immediate sync after unlock instead of waiting for interval

### Issue 3: Multiple Background Script Versions
- **Symptom**: Edits to `src/extension/background.ts` not reflected in runtime
- **Cause**: Vite configured to build from `public/background.ts`
- **Solution**: Align build configuration with source file locations

---

## Development Workflow

### Setting Up Development Environment
1. Start backend server: `cd server && npm run dev` (port 4000)
2. Start web app: `npm run dev` (port 5173 with proxy)
3. Build extension: `npm run build && node scripts/sync-extension.mjs`
4. Load extension in Chrome:
   - Navigate to `chrome://extensions`
   - Enable Developer Mode
   - Click "Load unpacked"
   - Select `extension-shell/popup` directory
5. Test changes:
   - Web app: Auto-reloads on save
   - Extension: Rebuild + reload extension after changes

### Debugging Tools
- **Web App**: Browser DevTools on `localhost:5173`
- **Extension Popup**: Right-click extension icon → Inspect popup
- **Extension Background**: `chrome://extensions` → Extension details → Inspect service worker
- **Extension Content Script**: DevTools on locked page → Console shows content script logs
- **Backend**: Server console logs all API requests

---

## Success Criteria

### Web Application
- ✅ User can create locks with name, URL, PIN
- ✅ Locks are persisted to database
- ✅ User can view all locks with current status
- ✅ User can unlock by providing correct PIN
- ✅ UI reflects real-time status changes

### Chrome Extension
- ✅ Extension syncs locks from backend on startup
- ✅ Content script detects locked domains on page load
- ✅ Full-page overlay blocks access to locked content
- ✅ User can unlock by entering correct PIN in overlay
- ✅ Overlay removes and page loads after successful unlock
- ✅ Invalid PIN shows error without removing overlay
- ✅ Background script handles all API communication
- ✅ Chrome Storage stays in sync with database state

### End-to-End
- ✅ Lock created in web app immediately affects browser
- ✅ Unlock from web app immediately removes browser restriction
- ✅ Unlock from browser overlay updates web app status
- ✅ All components use same backend API as single source of truth

---

## Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERACTIONS                        │
├─────────────────────┬───────────────────────────────────────┤
│   Web Application   │      Chrome Extension                 │
│   (localhost:5173)  │                                       │
└──────────┬──────────┴───────────────────┬───────────────────┘
           │                               │
           │ /api (proxied)                │ Direct API calls
           │                               │ http://localhost:4000
           │                               │
           ▼                               ▼
    ┌────────────────────────────────────────────┐
    │      Backend Server (Express)              │
    │      http://localhost:4000/api             │
    │                                            │
    │  - GET /locks                              │
    │  - POST /locks                             │
    │  - POST /locks/:id/unlock                  │
    │  - DELETE /locks/:id                       │
    └────────────────┬───────────────────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │  MySQL Database │
            │   tab_locks     │
            └─────────────────┘

Extension Internal Flow:
┌──────────────────┐         Message          ┌─────────────────┐
│ Content Script   │ ──────────────────────▶  │ Background      │
│ (Locked page)    │  {type, lockId, pin}     │ Service Worker  │
│                  │ ◀──────────────────────  │                 │
│ - Detect lock    │    {success, error}      │ - Handle msgs   │
│ - Show overlay   │                          │ - Call API      │
│ - Send unlock    │                          │ - Sync storage  │
└──────────────────┘                          └─────────────────┘
         │                                             │
         │ Read on page load                          │ Periodic sync
         ▼                                             ▼
    ┌────────────────────────────────────────────────────┐
    │         chrome.storage.local                       │
    │         LockedDomainCache                          │
    │  { "hostname": { lockId, name } }                 │
    └────────────────────────────────────────────────────┘
```

---

## File Structure Reference

### Backend
- `server/src/routes/tabLocks.ts` - API route handlers
- `server/src/app.ts` - Express app configuration
- Database connection configuration

### Frontend (Web App)
- `src/pages/WebAccessLock.tsx` - Lock management UI
- `src/services/api.ts` - API client with environment detection

### Extension
- **Background**: `public/background.ts` OR `src/extension/background.ts`
- **Content**: `public/content.ts` OR `src/extension/content.ts`
- **Storage Utils**: `src/utils/chromeStorage.ts`
- **Manifest**: `manifest.json` (root) AND `extension-shell/manifest.json`

### Build
- `vite.config.ts` - Build configuration (defines entry points)
- `scripts/sync-extension.mjs` - Sync script
- `dist/` - Build output
- `extension-shell/popup/` - Extension deployment directory

---

This document represents the **intended architecture and workflow** as planned, not necessarily the current implementation state. Use this as a reference specification when debugging or refactoring the codebase.
