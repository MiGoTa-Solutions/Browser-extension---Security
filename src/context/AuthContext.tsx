import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api';
import { AuthUser } from '../types';
import { clearAuthToken, getAuthToken, saveAuthToken } from '../utils/chromeStorage';
import { notifyExtensionSync } from '../utils/extensionApi'; // Import the fix

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });

  // 1. Initialize Auth State
  useEffect(() => {
    const bootstrap = async () => {
      try {
        // First, check LocalStorage (Fastest)
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setState({ user: parsed.user, token: parsed.token, loading: false });
          // Ensure Chrome Storage is in sync
          if (parsed.token) await saveAuthToken(parsed.token);
          return;
        }

        // Fallback: Check Chrome Storage
        const chromeToken = await getAuthToken();
        if (chromeToken) {
          const response = await authApi.me(chromeToken);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: chromeToken, user: response.user }));
          setState({ user: response.user, token: chromeToken, loading: false });
        } else {
          setState({ user: null, token: null, loading: false });
        }
      } catch (error) {
        console.error('Auth bootstrap failed:', error);
        localStorage.removeItem(STORAGE_KEY);
        clearAuthToken();
        setState({ user: null, token: null, loading: false });
      }
    };

    bootstrap();
  }, []);

  // 2. Auth Actions
  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    await saveAuthToken(response.token);
    
    setState({ user: response.user, token: response.token, loading: false });
    notifyExtensionSync(); // Fixed call
  };

  const register = async (payload: { email: string; password: string; pin?: string }) => {
    const response = await authApi.register(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    await saveAuthToken(response.token);
    
    setState({ user: response.user, token: response.token, loading: false });
    notifyExtensionSync(); // Fixed call
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    clearAuthToken();
    setState({ user: null, token: null, loading: false });
    notifyExtensionSync(); // Fixed call
  };

  const setPin = async (pin: string) => {
    if (!state.token) throw new Error('Not authenticated');
    await authApi.setPin(state.token, { pin });
    
    setState((prev) => {
      if (!prev.user || !prev.token) return prev;
      const updatedUser = { ...prev.user, hasPin: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: prev.token, user: updatedUser }));
      return { ...prev, user: updatedUser };
    });
  };

  const verifyPin = async (pin: string) => {
    if (!state.token) throw new Error('Not authenticated');
    await authApi.verifyPin(state.token, { pin });
  };

  const value = useMemo(() => ({
    ...state, login, register, logout, setPin, verifyPin
  }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}