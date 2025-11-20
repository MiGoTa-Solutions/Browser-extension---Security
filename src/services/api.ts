import { AuthUser, TabInfo, TabLock } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

interface RequestOptions {
  method?: string;
  token?: string | null;
  data?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', data, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = (payload as { error?: string })?.error || 'Unexpected server error';
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

export const tabLockApi = {
  list: (token: string) => request<{ locks: TabLock[] }>('/locks', { token }),
  create: (
    token: string,
    data: { name: string; isGroup: boolean; note?: string; tabs: TabInfo[]; pin: string }
  ) => request<{ lock: TabLock }>('/locks', { method: 'POST', token, data }),
  unlock: (token: string, lockId: number, pin: string) =>
    request<{ lock: TabLock }>(`/locks/${lockId}/unlock`, {
      method: 'POST',
      token,
      data: { pin },
    }),
  relock: (token: string, lockId: number, pin: string) =>
    request<{ lock: TabLock }>(`/locks/${lockId}/relock`, {
      method: 'POST',
      token,
      data: { pin },
    }),
  remove: (token: string, lockId: number, pin: string) =>
    request<{ success: boolean }>(`/locks/${lockId}`, {
      method: 'DELETE',
      token,
      data: { pin },
    }),
};
