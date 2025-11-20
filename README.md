# SecureShield Browser Extension

A comprehensive browser security suite built with React, TypeScript, and Tailwind CSS. This Chrome extension provides advanced security features including malicious site detection, web access control, threat quarantine, DOM inspection, and cookie security auditing.

## Features

### 🔒 Web Access Lock
- Lock individual tabs or named tab groups with PIN protection
- Store lock metadata (notes, timestamps, status) in the backend for device sync
- Unlock/re-lock flows that respect the user's PIN and audit trail

### 🔑 Authentication & PIN Security
- Email + password authentication backed by MySQL and JWT sessions
- Optional per-user PIN hashing for sensitive tab unlock actions
- `/auth/me` verification keeps the popup session in sync with the API
### 🛡️ Malicious Site Detector
- Real-time website security analysis
- Threat level assessment (Safe/Suspicious/Danger)
- Detailed security reports with threat indicators

### ⚠️ Threat Quarantine
- Isolate and manage detected security threats
- Release or permanently delete quarantined items
- Comprehensive threat categorization

### 👁️ DOM Content Inspection
- Real-time DOM anomaly detection
- Identify suspicious scripts, hidden iframes, and clickjacking attempts
- Severity-based threat classification

### 🍪 Cookie Security Audit
- Analyze cookie security attributes
- Check Secure, HttpOnly, and SameSite flags
- Risk assessment and recommendations

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Backend**: Node.js + Express + TypeScript (server/)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Extension**: Chrome Manifest V3
- **Icons**: Lucide React
- **Database**: Aiven MySQL (or compatible MySQL instance)
- **Security**: JWT authentication, bcrypt password/PIN hashing, zod validation

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Chrome browser for testing
- MySQL instance (the project uses an Aiven-hosted database, but any MySQL 8+ instance works)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Browser-extension
```

2. Install frontend dependencies (workspace root):
```bash
npm install
```

3. Install backend dependencies:
```bash
cd server
npm install
cd ..
```

### Environment Variables

Create the following files before running any servers:

- `./.env`: copy `.env.example` to `.env` then adjust `VITE_API_URL` (defaults to `http://localhost:4000/api`).
- `./server/.env`: copy `server/.env.example` to `server/.env` then set:
	- `PORT` (commonly `4000`)
	- `DATABASE_URL` (Aiven connection string or local MySQL DSN with optional `ssl-mode` parameters)
	- `JWT_SECRET` (generate a long random string)

The backend automatically applies the required schema (users + tab_locks tables) on startup.

### Running the apps

In one terminal, run the API server from `server/`:

```bash
cd server
npm run dev
```

In another terminal (workspace root), start the Vite dev server:

```bash
npm run dev
```

`vite.config.ts` proxies `/api` calls to `http://localhost:4000`, so the popup always talks to the local API without extra configuration.

### Building for production

```bash
# Frontend bundle for the extension
npm run build

# Backend compile + start
cd server
npm run build
npm start
```

### Loading the Extension in Chrome

1. Build the extension:
```bash
npm run build
```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in the top right)

4. Click "Load unpacked" and select the `dist` folder

5. The SecureShield extension should now appear in your extensions list

### Development Workflow

1. **Development**: Run `npm run dev` (workspace root) and `cd server && npm run dev` to keep both frontend and API hot-reloading
2. **Testing**: Load the extension in Chrome using the built files while the API server is running
3. **Debugging**: Use Chrome DevTools to debug popup, background script, and content scripts

### Extension Shell for Side-by-Side Testing

- After verifying a feature in the web app, run `npm run build:extension` to copy the `dist/` output into `extension-shell/popup/`.
- Load `extension-shell/` via `chrome://extensions` (Developer Mode → Load unpacked) to interact with the extension build while continuing to develop the web UI.
- Repeat `npm run build:extension` whenever you need to refresh the extension with the latest UI build. Icons/background/content scripts live alongside the shell and can evolve independently.

## Project Structure

```
.
├── src/                      # React popup application (Vite)
│   ├── components/           # Design system primitives (Button, Card, Modal, etc.)
│   ├── pages/                # Feature screens (WebAccessLock, ThreatQuarantine, ...)
│   ├── extension/            # Background + content scripts for MV3
│   ├── context/              # Auth provider + hooks
│   └── services/             # REST client (api.ts)
├── public/                   # Static assets served by Vite (background/content stubs)
├── server/                   # Express + MySQL API
│   ├── src/
│   │   ├── routes/           # auth + tab lock endpoints
│   │   ├── middleware/       # JWT guard
│   │   ├── config/           # Database pool + schema bootstrap
│   │   └── utils/            # JWT helpers
│   ├── package.json
│   └── tsconfig.json
└── manifest/tailwind/etc.    # Build + extension config files
```

## Available Scripts

Frontend (workspace root):
- `npm run dev` - Start the Vite development server with proxy to `/api`
- `npm run build` - Build the popup/extension bundle into `dist/`
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

Backend (`server/` directory):
- `npm run dev` - Start the Express API with `ts-node-dev`
- `npm run build` - Compile TypeScript to `dist/`
- `npm start` - Run the compiled server
- `npm run lint` - Type-check the backend sources

## Extension Architecture

### Manifest V3
The extension uses Chrome's Manifest V3 with:
- **Service Worker**: Background processing and API handling
- **Content Scripts**: DOM inspection and real-time monitoring
- **Popup**: Main UI interface built with React

## Backend API Overview

- **Base URL**: `http://localhost:4000/api` (or `VITE_API_URL` in production)
- **Auth**: Send `Authorization: Bearer <jwt>` for every request after login/registration
- **Content Type**: JSON in/out

Endpoints:
- `POST /auth/register` & `POST /auth/login` &rarr; create or authenticate users; both return `{ token, user }`
- `GET /auth/me` &rarr; validate the current token and refresh user data
- `POST /auth/set-pin` & `POST /auth/verify-pin` &rarr; manage the optional unlock PIN for sensitive flows
- `GET /locks` &rarr; list the current user's tab locks
- `POST /locks` &rarr; create a lock (tabs, metadata, group flag)
- `POST /locks/:id/unlock` & `POST /locks/:id/relock` &rarr; transition lock status with server-side auditing

### Security Features (Placeholder Implementation)

Current implementation provides UI placeholders for:

1. **URL Blocking**: Framework for blocking specific websites
2. **Threat Detection**: Interface for security analysis results
3. **DOM Monitoring**: Structure for detecting page anomalies
4. **Cookie Analysis**: Framework for cookie security assessment

### Future Development

The extension is designed for easy integration with:
- Threat intelligence APIs
- Chrome Extension APIs (tabs, webRequest, cookies, etc.)
- Real-time security monitoring services
- Machine learning-based threat detection

## Design System

### Colors
- **Primary**: Blue (#3B82F6)
- **Success/Safe**: Green (#10B981)
- **Warning/Suspicious**: Orange (#F59E0B) 
- **Danger/Threat**: Red (#EF4444)
- **Neutral**: Gray scale

### Accessibility
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- High contrast color ratios

## Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Edge 88+ (Chromium-based)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

This extension handles sensitive security data. Please report security vulnerabilities responsibly to the maintainers.

---

**Note**: This is currently a UI framework with placeholder functionality. The actual security features need to be implemented using appropriate Chrome Extension APIs and security services.