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
  avatarUrl: string | null;
  displayName?: string | null;
}

export interface UserProfileSettings {
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  notificationsEmail: boolean;
  notificationsBrowser: boolean;
  autoLockNewTabs: boolean;
  autoSyncInterval: number;
}

export interface UpdateProfilePayload {
  displayName?: string | null;
  avatarUrl?: string | null;
  timezone?: string;
  notificationsEmail?: boolean;
  notificationsBrowser?: boolean;
  autoLockNewTabs?: boolean;
  autoSyncInterval?: number;
}

export interface UserProfileResponse {
  user: AuthUser;
  settings: UserProfileSettings;
}

export interface TabInfo {
  title: string;
  url: string;
}

export interface TabLock {
  id: number;
  user_id: number;
  url: string;
  lock_name: string;
  is_locked: boolean;
  created_at: string;
}

export interface CreateLockPayload {
  url: string;
  name?: string;
}