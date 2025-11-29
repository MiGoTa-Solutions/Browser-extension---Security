import { AuthUser, TabInfo } from '../types';

// ==================== ENVIRONMENT DETECTION ====================

/**
 * Detect if running in Chrome Extension context
 */
function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && chrome.runtime?.id !== undefined;
}

/**
 * Get the correct API base URL based on environment
 * - Extension: Use absolute URL (http://localhost:4000/api)
 * - Web App: Use relative path (/api) which Vite proxies
 */
function getApiBaseUrl(): string {
  if (isExtensionContext()) {
    // Extension context: MUST use absolute URL
    const extensionApiUrl = 'http://localhost:4000/api';
    console.log('[API] Running in Extension context, using absolute URL:', extensionApiUrl);
    return extensionApiUrl;
  } else {
    // Web app context: Use relative path (proxied by Vite)
    const webApiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
    console.log('[API] Running in Web App context, using relative URL:', webApiUrl);
    return webApiUrl;
  }
}

const API_BASE_URL = getApiBaseUrl();

// ==================== LOGGING UTILITY ====================

function logRequest(method: string, url: string, hasToken: boolean, hasData: boolean) {
  console.log(
    `[API Request] ${method} ${url} | Auth: ${hasToken ? '✓' : '✗'} | Data: ${hasData ? '✓' : '✗'}`
  );
}

function logResponse(method: string, path: string, status: number, success: boolean) {
  const emoji = success ? '✅' : '❌';
  console.log(`[API Response] ${emoji} ${method} ${path} | Status: ${status}`);
}

function logError(method: string, path: string, error: unknown) {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    console.error(
      `[API Error] ❌ Network Error on ${method} ${path}\n` +
      `  → Likely causes:\n` +
      `    1. Server not running (check http://localhost:4000)\n` +
      `    2. CORS blocked (extension needs absolute URL)\n` +
      `    3. Firewall/network issue\n` +
      `  → Original error: ${error.message}`
    );
  } else if (error instanceof Error) {
    console.error(`[API Error] ❌ ${method} ${path}: ${error.message}`);
  } else {
    console.error(`[API Error] ❌ ${method} ${path}:`, error);
  }
}

// ==================== REQUEST HANDLER ====================

interface RequestOptions {
  method?: string;
  token?: string | null;
  data?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', data, token } = options;
  const fullUrl = `${API_BASE_URL}${path}`;

  // Log outgoing request
  logRequest(method, fullUrl, !!token, !!data);

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
    // Network-level error (server down, CORS, DNS, etc.)
    logError(method, path, error);
    throw error;
  }

  // Log response status
  logResponse(method, path, response.status, response.ok);

  // Parse response body
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  // Handle HTTP errors
  if (!response.ok) {
    const errorMessage = (payload as { error?: string })?.error || 'Unexpected server error';
    
    // Log specific HTTP error details
    if (response.status === 401) {
      console.error(`[API Error] 🔒 Unauthorized (401) on ${method} ${path} - Token may be invalid or expired`);
    } else if (response.status === 403) {
      console.error(`[API Error] 🚫 Forbidden (403) on ${method} ${path} - Insufficient permissions`);
    } else if (response.status === 404) {
      console.error(`[API Error] 🔍 Not Found (404) on ${method} ${path} - Resource does not exist`);
    } else if (response.status === 500) {
      console.error(`[API Error] 💥 Server Error (500) on ${method} ${path} - Check server logs`);
    }
    
    throw new Error(errorMessage);
  }

  return payload as T;
}

export const authApi = {
  register: (data: { email: string; password: string; pin?: string }) =>
    request<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      data,
    }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      data,
    }),
  me: (token: string) => request<{ user: AuthUser }>('/auth/me', { token }),
  setPin: (token: string, data: { pin: string }) =>
    request<{ success: boolean }>('/auth/set-pin', { method: 'POST', token, data }),
  verifyPin: (token: string, data: { pin: string }) =>
    request<{ success: boolean }>('/auth/verify-pin', { method: 'POST', token, data }),
};

// ... existing imports and code ...

// Add this alongside authApi and scannerApi
export const webAccessLockApi = {
  list: (token: string) => 
    request<{ locks: any[] }>('/locks', { token }),
    
  create: (token: string, data: { url: string; name?: string }) => 
    request<{ success: boolean; lock: any }>('/locks', { method: 'POST', token, data }),
    
  delete: (token: string, id: number) => 
    request<{ success: boolean }>(`/locks/${id}`, { method: 'DELETE', token }),
};