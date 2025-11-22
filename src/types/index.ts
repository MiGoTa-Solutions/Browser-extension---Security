export interface BlockedSite {
  id: string;
  url: string;
  dateAdded: string;
  reason?: string;
}

export interface ThreatItem {
  id: string;
  url: string;
  threatType: 'malware' | 'phishing' | 'suspicious';
  dateDetected: string;
  severity: 'low' | 'medium' | 'high';
  status: 'quarantined' | 'released' | 'deleted';
}

export interface DOMAnomaly {
  id: string;
  element: string;
  anomalyType: 'suspicious_script' | 'hidden_iframe' | 'form_hijack' | 'click_jacking';
  severity: 'low' | 'medium' | 'high';
  dateDetected: string;
  url: string;
}

export interface CookieAudit {
  id: string;
  name: string;
  domain: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'Strict' | 'Lax' | 'None' | undefined;
  value: string;
  expires?: string;
  path: string;
  riskLevel: 'safe' | 'warning' | 'danger';
}

export type RiskLevel = 'safe' | 'suspicious' | 'danger';

export interface SiteAnalysisResult {
  url: string;
  riskLevel: RiskLevel;
  threats: string[];
  timestamp: string;
  details: {
    malwareDetected: boolean;
    phishingIndicators: number;
    suspiciousContent: string[];
    certificateValid: boolean;
  };
}

export interface AuthUser {
  id: number;
  email: string;
  hasPin: boolean;
}

export interface TabInfo {
  title: string;
  url: string;
}

// Web Access Lock types removed. External module will reintroduce them.
// Placeholder (unreferenced) kept for ease of future diffing:
// export interface TabLock { /* provided by external module */ }