import { AuthUser } from '../types';

// ==================== ENVIRONMENT DETECTION ====================

function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && chrome.runtime?.id !== undefined;
}

function getApiBaseUrl(): string {
  if (isExtensionContext()) {
    const extensionApiUrl = 'http://127.0.0.1:4000/api';
    return extensionApiUrl;
  } else {
    const webApiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
    return webApiUrl;
  }
}

const API_BASE_URL = getApiBaseUrl();

// ==================== REQUEST HANDLER ====================

interface RequestOptions {
  method?: string;
  token?: string | null;
  data?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', data, token } = options;
  const fullUrl = `${API_BASE_URL}${path}`;

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
    throw new Error(errorMessage);
  }

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