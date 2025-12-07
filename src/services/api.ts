import { AuthUser, UpdateProfilePayload, UserProfileResponse } from '../types';
import { GOOGLE_ERROR_MESSAGE, GOOGLE_TOKEN_MESSAGE } from '../utils/googleBridge';
import { logError, logInfo, logWarn } from '../utils/logger';
import { getAuthToken } from '../utils/chromeStorage';

// ==================== ENVIRONMENT DETECTION ====================

function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && chrome.runtime?.id !== undefined;
}

export function getApiBaseUrl(): string {
  if (isExtensionContext()) {
    const extensionApiUrl = 'http://127.0.0.1:4000/api';
    return extensionApiUrl;
  } else {
    const webApiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
    return webApiUrl;
  }
}

const API_BASE_URL = getApiBaseUrl();
const DEFAULT_GOOGLE_SUCCESS_PATH = import.meta.env.VITE_GOOGLE_SUCCESS_PATH || '/#/auth/google';

// ==================== REQUEST HANDLER ====================

interface RequestOptions {
  method?: string;
  token?: string | null;
  data?: unknown;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', data, token } = options;
  const fullUrl = `${API_BASE_URL}${path}`;
  const meta = { method, path };
  logInfo('ApiClient', 'Sending request', meta);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch (error) {
    logError('ApiClient', 'Network error', { ...meta, error: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const errorMessage = (payload as { error?: string })?.error || 'Unexpected server error';
    logWarn('ApiClient', 'Request failed', { ...meta, status: response.status, error: errorMessage });
    throw new ApiError(errorMessage, response.status, payload);
  }

  logInfo('ApiClient', 'Request succeeded', { ...meta, status: response.status });
  return payload as T;
}

export const authApi = {
  register: (data: { email: string; password: string; pin?: string }) =>
    request<{ token: string; user: AuthUser }>('/auth/register', { method: 'POST', data }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('/auth/login', { method: 'POST', data }),
  me: (token: string) => request<{ user: AuthUser }>('/auth/me', { token }),
  setPin: (token: string, data: { pin: string }) =>
    request<{ success: boolean }>('/auth/set-pin', { method: 'POST', token, data }),
  verifyPin: (token: string, data: { pin: string }) =>
    request<{ success: boolean }>('/auth/verify-pin', { method: 'POST', token, data }),
};

export const profileApi = {
  get: (token: string) => request<UserProfileResponse>('/profile', { token }),
  update: (token: string, data: UpdateProfilePayload) =>
    request<UserProfileResponse>('/profile', { method: 'PUT', token, data }),
};

export const webAccessLockApi = {
  list: (token: string) => 
    request<{ locks: any[] }>('/locks', { token }),
    
  create: (token: string, data: { url: string; name?: string }) => 
    request<{ success: boolean; lock: any }>('/locks', { method: 'POST', token, data }),
  
  // NEW METHOD
  toggleLock: (token: string, id: number, is_locked: boolean) =>
    request<{ success: boolean; is_locked: boolean }>(`/locks/${id}/status`, { 
        method: 'PATCH', 
        token, 
        data: { is_locked } 
    }),

  delete: (token: string, id: number) => 
    request<{ success: boolean }>(`/locks/${id}`, { method: 'DELETE', token }),
};

export function buildGoogleAuthStartUrl(redirectOverride?: string): string {
  const redirectTarget = redirectOverride ?? buildDefaultGoogleRedirect();
  const params = new URLSearchParams();
  if (redirectTarget) {
    params.set('redirect', redirectTarget);
  }

  const query = params.toString();
  return `${API_BASE_URL}/auth/google/start${query ? `?${query}` : ''}`;
}

export function buildDefaultGoogleRedirect(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const { origin, pathname } = window.location;
  if (DEFAULT_GOOGLE_SUCCESS_PATH.startsWith('#')) {
    return `${origin}${pathname}${DEFAULT_GOOGLE_SUCCESS_PATH}`;
  }

  if (DEFAULT_GOOGLE_SUCCESS_PATH.startsWith('/')) {
    return `${origin}${DEFAULT_GOOGLE_SUCCESS_PATH}`;
  }

  return `${origin}/${DEFAULT_GOOGLE_SUCCESS_PATH}`;
}

export function startGoogleAuthFlow(redirectOverride?: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.href = buildGoogleAuthStartUrl(redirectOverride);
}

export function startExtensionGoogleAuthFlow(redirectOverride?: string): Promise<string> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window_unavailable'));
  }

  return new Promise((resolve, reject) => {
    const authUrl = buildGoogleAuthStartUrl(redirectOverride);
    logInfo('ExtensionGoogleAuth', 'Opening OAuth popup');
    const popup = window.open(
      authUrl,
      'SecureShieldGoogleAuth',
      'width=480,height=640,menubar=no,toolbar=no,location=no,status=no'
    );

    if (!popup) {
      logError('ExtensionGoogleAuth', 'Popup blocked by browser');
      reject(new Error('popup_blocked'));
      return;
    }

    let settled = false;
    let closeGuardArmed = false;
    let closeGraceTimeout: number | null = null;
    let closeGraceAttempts = 0;
    const CLOSE_RETRY_DELAY_MS = 1000;
    const MAX_CLOSE_ATTEMPTS = 10;
    const guardTimer = window.setTimeout(() => {
      closeGuardArmed = true;
    }, 1200);

    const resolveWithToken = (token: string, channel: 'runtime' | 'window' | 'storage' | 'storage-poll') => {
      cleanup();
      logInfo('ExtensionGoogleAuth', 'Received token', { channel });
      resolve(token);
    };

    const runtimeListener = (message: { type?: string; token?: string; error?: string }) => {
      if (message?.type === GOOGLE_TOKEN_MESSAGE && typeof message.token === 'string') {
        resolveWithToken(message.token, 'runtime');
      } else if (message?.type === GOOGLE_ERROR_MESSAGE) {
        cleanup();
        logError('ExtensionGoogleAuth', 'Runtime reported Google auth error', { error: message.error ?? 'unknown_error' });
        reject(new Error(message.error || 'google_auth_failed'));
      }
    };

    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== 'local') {
        return;
      }

      const authChange = changes.auth_token;
      if (authChange && typeof authChange.newValue === 'string' && authChange.newValue.length > 0) {
        resolveWithToken(authChange.newValue, 'storage');
      }
    };

    const attemptResolveFromStorage = async (channel: 'storage-poll'): Promise<boolean> => {
      try {
        const storedToken = await getAuthToken();
        if (storedToken) {
          resolveWithToken(storedToken, channel);
          return true;
        }
      } catch (error) {
        logWarn('ExtensionGoogleAuth', 'Failed to read stored token during fallback', {
          error: error instanceof Error ? error.message : 'unknown_error',
        });
      }
      return false;
    };

    const cleanup = () => {
      if (settled) {
        window.clearInterval(closeWatcher);
        window.clearTimeout(guardTimer);
        if (closeGraceTimeout) {
          window.clearTimeout(closeGraceTimeout);
        }
        return;
      }
      settled = true;
      window.removeEventListener('message', handleMessage);
      window.clearInterval(closeWatcher);
      window.clearTimeout(guardTimer);
      if (closeGraceTimeout) {
        window.clearTimeout(closeGraceTimeout);
      }
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(runtimeListener as any);
      }
      if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(storageListener as any);
      }
      if (!popup.closed) {
        popup.close();
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'object' || event.data === null) {
        return;
      }

      const payloadType = (event.data as { type?: string }).type;
      if (payloadType === GOOGLE_TOKEN_MESSAGE) {
        const token = (event.data as { token?: string }).token;
        if (typeof token !== 'string' || token.length === 0) {
          cleanup();
          logError('ExtensionGoogleAuth', 'Received malformed token payload');
          reject(new Error('missing_token'));
          return;
        }
        cleanup();
        logInfo('ExtensionGoogleAuth', 'Received token from popup');
        resolve(token);
      } else if (payloadType === GOOGLE_ERROR_MESSAGE) {
        const errorMessage = (event.data as { error?: string }).error || 'google_auth_failed';
        cleanup();
        logError('ExtensionGoogleAuth', 'Popup reported error', { error: errorMessage });
        reject(new Error(errorMessage));
      }
    };

    const queueCloseConfirmation = () => {
      if (closeGraceTimeout !== null || settled) {
        return;
      }

      closeGraceTimeout = window.setTimeout(async function confirmClosure() {
        closeGraceTimeout = null;
        if (settled) {
          return;
        }

        const resolved = await attemptResolveFromStorage('storage-poll');
        if (resolved || settled) {
          return;
        }

        closeGraceAttempts += 1;
        if (closeGraceAttempts >= MAX_CLOSE_ATTEMPTS) {
          cleanup();
          logWarn('ExtensionGoogleAuth', 'Popup closed before completion');
          reject(new Error('popup_closed'));
        } else {
          queueCloseConfirmation();
        }
      }, CLOSE_RETRY_DELAY_MS);
    };

    const closeWatcher = window.setInterval(() => {
      if (!closeGuardArmed || settled) {
        return;
      }

      if (popup.closed) {
        queueCloseConfirmation();
      }
    }, 400);

    window.addEventListener('message', handleMessage);
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(runtimeListener as any);
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(storageListener as any);
    } else {
      logWarn('ExtensionGoogleAuth', 'chrome.storage.onChanged unavailable; storage fallback disabled');
    }
  });
}