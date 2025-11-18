# SecureShield Browser Extension

A comprehensive browser security suite built with React, TypeScript, and Tailwind CSS. This Chrome extension provides advanced security features including malicious site detection, web access control, threat quarantine, DOM inspection, and cookie security auditing.

## Features

### 🔒 Web Access Lock
- Block access to specific websites
- URL-based filtering with custom block reasons
- Easy management of blocked sites list

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
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Extension**: Chrome Manifest V3
- **Icons**: Lucide React

## Development Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Chrome browser for testing

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd secureshield-extension
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Build the extension:
```bash
npm run build
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

1. **Development**: Run `npm run dev` to start the Vite development server
2. **Testing**: Load the extension in Chrome using the built files
3. **Debugging**: Use Chrome DevTools to debug popup, background script, and content scripts

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx      # Accessible button component
│   ├── Input.tsx       # Form input with validation
│   ├── Card.tsx        # Content containers
│   ├── Modal.tsx       # Modal dialogs
│   ├── Spinner.tsx     # Loading indicators
│   ├── Skeleton.tsx    # Loading placeholders
│   ├── StatusBadge.tsx # Security status indicators
│   └── Navigation.tsx  # Main navigation component
├── pages/              # Main application pages
│   ├── WebAccessLock.tsx
│   ├── MaliciousSiteDetector.tsx
│   ├── ThreatQuarantine.tsx
│   ├── DOMContentInspection.tsx
│   └── CookieSecurityAudit.tsx
├── extension/          # Extension-specific code
│   ├── background.ts   # Background service worker
│   └── content.ts      # Content script
├── mocks/             # Mock data for development
│   └── data.ts
├── types/             # TypeScript type definitions
│   └── index.ts
├── utils/             # Utility functions
│   └── cn.ts          # Class name utility
└── App.tsx            # Main application component
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Extension Architecture

### Manifest V3
The extension uses Chrome's Manifest V3 with:
- **Service Worker**: Background processing and API handling
- **Content Scripts**: DOM inspection and real-time monitoring
- **Popup**: Main UI interface built with React

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