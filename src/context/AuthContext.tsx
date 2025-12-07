import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api';
import { AuthUser } from '../types';
import { clearAuthToken, getAuthToken, saveAuthToken } from '../utils/chromeStorage';
import { notifyExtensionSync } from '../utils/extensionApi';
import { logError, logInfo } from '../utils/logger';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; pin?: string }) => Promise<void>;
  completeTokenLogin: (token: string) => Promise<void>;
  logout: () => void;
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<void>;
  updateUserProfile: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'secureShield.auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });

  useEffect(() => {
    const bootstrap = async () => {
      logInfo('AuthProvider', 'Bootstrapping auth state');
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setState({ user: parsed.user, token: parsed.token, loading: false });
          if (parsed.token) await saveAuthToken(parsed.token);
          logInfo('AuthProvider', 'Restored session from localStorage', { userId: parsed.user?.id ?? null });
          return;
        }

        const chromeToken = await getAuthToken();
        if (chromeToken) {
          const response = await authApi.me(chromeToken);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: chromeToken, user: response.user }));
          setState({ user: response.user, token: chromeToken, loading: false });
          logInfo('AuthProvider', 'Restored session from chrome storage', { userId: response.user.id });
        } else {
          setState({ user: null, token: null, loading: false });
          logInfo('AuthProvider', 'No previous session found');
        }
      } catch (error) {
        logError('AuthProvider', 'Auth bootstrap failed', { error: error instanceof Error ? error.message : 'unknown_error' });
        localStorage.removeItem(STORAGE_KEY);
        await clearAuthToken();
        setState({ user: null, token: null, loading: false });
      }
    };

    bootstrap();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    logInfo('AuthProvider', 'Attempting credential login', { email });
    const response = await authApi.login({ email, password });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    await saveAuthToken(response.token);
    setState({ user: response.user, token: response.token, loading: false });
    notifyExtensionSync();
    logInfo('AuthProvider', 'Credential login successful', { userId: response.user.id });
  }, []);

  const register = useCallback(async (payload: { email: string; password: string; pin?: string }) => {
    logInfo('AuthProvider', 'Attempting registration', { email: payload.email });
    const response = await authApi.register(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    await saveAuthToken(response.token);
    setState({ user: response.user, token: response.token, loading: false });
    notifyExtensionSync();
    logInfo('AuthProvider', 'Registration successful', { userId: response.user.id });
  }, []);

  const completeTokenLogin = useCallback(async (token: string) => {
    logInfo('AuthProvider', 'Completing token-based login');
    const response = await authApi.me(token);
    const payload = { token, user: response.user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    await saveAuthToken(token);
    setState({ user: response.user, token, loading: false });
    notifyExtensionSync();
    logInfo('AuthProvider', 'Token login finalized', { userId: response.user.id });
  }, []);

  const logout = useCallback(() => {
    logInfo('AuthProvider', 'Logging out current session', { userId: state.user?.id ?? null });
    localStorage.removeItem(STORAGE_KEY);
    clearAuthToken();
    setState({ user: null, token: null, loading: false });
    notifyExtensionSync();
  }, [state.user?.id]);

  const setPin = useCallback(async (pin: string) => {
    if (!state.token) throw new Error('Not authenticated');
    logInfo('AuthProvider', 'Setting PIN for user', { userId: state.user?.id ?? null });
    await authApi.setPin(state.token, { pin });
    setState((prev) => {
      if (!prev.user || !prev.token) return prev;
      const updatedUser = { ...prev.user, hasPin: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: prev.token, user: updatedUser }));
      return { ...prev, user: updatedUser };
    });
    logInfo('AuthProvider', 'PIN set successfully', { userId: state.user?.id ?? null });
  }, [state.token, state.user?.id]);

  const verifyPin = useCallback(async (pin: string) => {
    if (!state.token) throw new Error('Not authenticated');
    logInfo('AuthProvider', 'Verifying PIN', { userId: state.user?.id ?? null });
    await authApi.verifyPin(state.token, { pin });
    logInfo('AuthProvider', 'PIN verified', { userId: state.user?.id ?? null });
  }, [state.token, state.user?.id]);

  const updateUserProfile = useCallback((nextUser: AuthUser) => {
    logInfo('AuthProvider', 'Updating cached user profile', { userId: nextUser.id });
    setState((prev) => {
      const mergedUser = prev.user ? { ...prev.user, ...nextUser } : nextUser;
      if (prev.token) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: prev.token, user: mergedUser }));
      }
      return { ...prev, user: mergedUser };
    });
    notifyExtensionSync();
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      login,
      register,
      completeTokenLogin,
      logout,
      setPin,
      verifyPin,
      updateUserProfile,
    }),
    [state, login, register, completeTokenLogin, logout, setPin, verifyPin, updateUserProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}