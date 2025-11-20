import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api';
import { AuthUser } from '../types';
import { clearAuthFromChromeStorage, readAuthFromChromeStorage, writeAuthToChromeStorage } from '../utils/chromeStorage';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; pin?: string }) => Promise<void>;
  logout: () => void;
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'secureShield.auth';

function persistAuthState(data: { token: string; user: AuthUser }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to persist auth state', error);
  }

  void writeAuthToChromeStorage(data);
}

function readPersistedAuthState(): { token: string; user: AuthUser } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { token: string; user: AuthUser }) : null;
  } catch (error) {
    console.warn('Failed to read persisted auth state', error);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      let persisted = readPersistedAuthState();

      if (!persisted) {
        persisted = await readAuthFromChromeStorage();
        if (persisted) {
          persistAuthState(persisted);
        }
      }

      if (!persisted) {
        if (mounted) {
          setState((prev) => ({ ...prev, loading: false }));
        }
        return;
      }

      try {
        const response = await authApi.me(persisted.token);
        if (!mounted) return;
        const syncedState = { token: persisted.token, user: response.user };
        persistAuthState(syncedState);
        setState({ user: response.user, token: persisted.token, loading: false });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        await clearAuthFromChromeStorage();
        if (mounted) {
          setState({ user: null, token: null, loading: false });
        }
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    persistAuthState(response);
    setState({ user: response.user, token: response.token, loading: false });
  };

  const register = async (payload: { email: string; password: string; pin?: string }) => {
    const response = await authApi.register(payload);
    persistAuthState(response);
    setState({ user: response.user, token: response.token, loading: false });
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    void clearAuthFromChromeStorage();
    setState({ user: null, token: null, loading: false });
  };

  const setPin = async (pin: string) => {
    if (!state.token) throw new Error('Not authenticated');
    await authApi.setPin(state.token, { pin });
    setState((prev) => {
      if (!prev.user || !prev.token) return prev;
      const updatedUser = { ...prev.user, hasPin: true } satisfies AuthUser;
      persistAuthState({ token: prev.token, user: updatedUser });
      return { ...prev, user: updatedUser };
    });
  };

  const verifyPin = async (pin: string) => {
    if (!state.token) throw new Error('Not authenticated');
    await authApi.verifyPin(state.token, { pin });
  };

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    login,
    register,
    logout,
    setPin,
    verifyPin,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state.user, state.token, state.loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
