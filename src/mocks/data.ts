import { BlockedSite, ThreatItem, DOMAnomaly, CookieAudit } from '../types';

export const mockBlockedSites: BlockedSite[] = [
  {
    id: '1',
    url: 'malicious-site.example.com',
    dateAdded: '2024-01-15',
    reason: 'Known phishing site'
  },
  {
    id: '2',
    url: 'suspicious-ads.example.org',
    dateAdded: '2024-01-12',
    reason: 'Malvertising detected'
  }
];

export const mockThreats: ThreatItem[] = [
  {
    id: '1',
    url: 'fake-bank.example.com',
    threatType: 'phishing',
    dateDetected: '2024-01-15T10:30:00Z',
    severity: 'high',
    status: 'quarantined'
  },
  {
    id: '2',
    url: 'malware-download.example.net',
    threatType: 'malware',
    dateDetected: '2024-01-14T15:45:00Z',
    severity: 'high',
    status: 'quarantined'
  }
];

export const mockDOManomalies: DOMAnomaly[] = [
  {
    id: '1',
    element: 'script[src*="suspicious-tracker"]',
    anomalyType: 'suspicious_script',
    severity: 'medium',
    dateDetected: '2024-01-15T11:20:00Z',
    url: 'shopping-site.example.com'
  },
  {
    id: '2',
    element: 'iframe[style*="display:none"]',
    anomalyType: 'hidden_iframe',
    severity: 'high',
    dateDetected: '2024-01-15T09:15:00Z',
    url: 'news-site.example.org'
  }
];

export const mockCookies: CookieAudit[] = [
  {
    id: '1',
    name: 'session_id',
    domain: 'example.com',
    secure: false,
    httpOnly: false,
    sameSite: undefined,
    value: 'abc123def456',
    path: '/',
    riskLevel: 'danger'
  },
  {
    id: '2',
    name: 'auth_token',
    domain: 'secure-site.com',
    secure: true,
    httpOnly: true,
    sameSite: 'Strict',
    value: 'xyz789uvw012',
    path: '/',
    riskLevel: 'safe'
  }
];