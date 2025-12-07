# Site Detector Feature Plan

## 1. Objectives
- Analyze arbitrary URLs/domains for malicious indicators directly from the SecureShield app/extension.
- Provide actionable insights (risk score, detected issues, recommended actions).
- Store recent analyses so users can review history and share findings with incident responders.

## 2. High-Level Flow
1. User submits a URL from the Site Detector page (or extension popup).
2. Frontend posts request to backend endpoint `/api/sites/analyze` with context (url, optional metadata).
3. Backend orchestrates detection pipeline:
   - Normalizes URL/domain.
   - Runs internal heuristics (e.g., suspicious TLDs, entropy, keyword checks).
   - Optionally queries external intelligence APIs (PhishTank, Google Safe Browsing, etc.).
   - Aggregates Chrome extension telemetry (if any) about that domain (hooks available via background scripts).
4. Backend persists result in `site_analyses` table and returns structured response.
5. UI renders summary, detailed findings, and recommended mitigation steps.
6. Optional: Web Access Lock CTA to immediately block the suspicious domain.

## 3. Backend Design
### 3.1 API Endpoints
- `POST /api/sites/analyze`
  - Body: `{ url: string, source?: 'web' | 'extension', tabInfo?: { title?: string } }`
  - Response: `{ analysisId, url, riskLevel, threats: string[], timestamp, details, recommendations }`
- `GET /api/sites`
  - Query params for pagination/filtering.
  - Returns list of recent analyses for the authenticated user.
- `GET /api/sites/:id`
  - Fetches full analysis record including raw signals, external API references.

### 3.2 Database
- New table `site_analyses`
  - `id` (PK), `user_id`, `url`, `normalized_domain`, `risk_level`, `threats_json`, `details_json`, `recommendations_json`, `source`, `created_at`.
- Optional table `site_analysis_signals` for detailed telemetry (per signal row), but JSON columns are OK initially.

### 3.3 Detection Pipeline Components
- **URL Normalizer**: Strips protocol, www, etc.
- **Heuristic Engine**
  - Suspicious keywords in path/query.
  - Domain age lookup (WHOIS API integration optional).
  - Entropy / randomness metrics.
  - Known bad TLD list (config file).
- **External Integrations (pluggable)**
  - Provide adapters (e.g., `providers/googleSafeBrowsing.ts`).
  - Each returns `ProviderResult` with severity + notes.
- **Aggregation**
  - Weighted scoring: heuristics + external results -> `riskLevel` (`safe`, `suspicious`, `danger`).
  - Compose `threats` array summarizing top findings.
  - Build `recommendations` (strings referencing Web Access Lock, cookie audit, etc.).

### 3.4 Security/Perf Considerations
- Enforce rate limiting per user to prevent abuse.
- Timeout external API calls; degrade gracefully if providers fail.
- Cache results for recently scanned domains (e.g., 15 minutes) to reduce costs.

## 4. Frontend Experience
### Page Structure (SiteDetector)
1. **Hero/Input Card**
   - Large input for URL, with helper text.
   - Analyze button + optional "Use current tab" action (pull from browser API when available).
2. **Result Summary**
   - Risk badge (color-coded) + timestamp.
   - Quick stats (threat count, external matches, last scan).
3. **Details Grid**
   - Sections for: Network indicators, DOM anomalies, Certificate/HTTPS, External intel results.
   - Each section uses `Card`/`StatusBadge` components for consistency.
4. **Actions**
   - Button to lock the site (links to Web Access Lock with pre-filled domain).
   - Button to export/share (copy summary, download JSON/PDF later).
5. **History Sidebar/Table**
   - Recent analyses with risk badge, domain, date.
   - Clicking loads detail view.

### State Management
- Reuse `useAuth` for token.
- Create `siteDetectorApi` module mirroring backend endpoints.
- Use `Skeleton`/`Spinner` components for loading states.
- Toast notifications for success/failure.

## 5. Extension Integration
- Background script can capture visited URLs and trigger on-demand analyses.
- Content script may collect DOM indicators (e.g., inline scripts) and send to backend.
- Sync results back to extension popup to display risk warnings when user visits dangerous sites.

## 6. Incremental Milestones
1. **MVP Backend**: `/api/sites/analyze` with basic heuristics + persistence.
2. **Frontend MVP**: Single-page UI that submits URL, shows summary + threat list.
3. **History View**: Add `GET /api/sites` consumption and UI list.
4. **External Provider Integrations**.
5. **Extension Hooks**.
6. **Sharing/Export** features.

## 7. Open Questions
- Which external threat intel providers should we prioritize?
- Do we require user consent before storing analyzed URLs? (privacy/legal).
- Should results expire or be deletable by the user?
- Is there a need for team-wide sharing/export (multi-user tenancy)?

## 8. Next Steps
- Confirm scope of MVP (which heuristics/providers).
- Finalize API contract and DB migration scripts.
- Create backend service skeleton (`server/src/routes/siteDetector.ts`, utils, providers).
- Mock the frontend page layout to align with existing design language.
