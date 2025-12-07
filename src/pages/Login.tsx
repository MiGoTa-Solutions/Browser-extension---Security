import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CommandLayout } from '../components/CommandLayout';
import { startGoogleAuthFlow, startExtensionGoogleAuthFlow } from '../services/api';
import { isExtensionContext } from '../utils/extensionApi';
import { waitForAuthToken } from '../utils/chromeStorage';
import { logError, logInfo, logWarn } from '../utils/logger';

export function Login() {
  const navigate = useNavigate();
  const { login, completeTokenLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleRedirecting(true);

    try {
      const context = isExtensionContext() ? 'extension' : 'web';
      logInfo('LoginPage', 'Google auth started', { context });

      if (context === 'extension') {
        logInfo('LoginPage', 'Starting Google auth inside extension');
        const token = await startExtensionGoogleAuthFlow();
        await completeTokenLogin(token);
        logInfo('LoginPage', 'Extension Google auth completed');
        navigate('/wal', { replace: true });
        setIsGoogleRedirecting(false);
      } else {
        logInfo('LoginPage', 'Redirecting to Google auth (web)');
        startGoogleAuthFlow();
      }
    } catch (err) {
      const fallbackToken = await waitForAuthToken();
      if (fallbackToken) {
        try {
          logWarn('LoginPage', 'Popup reported error but token detected, attempting recovery');
          await completeTokenLogin(fallbackToken);
          navigate('/wal', { replace: true });
          logInfo('LoginPage', 'Recovered Google auth via stored token');
          setIsGoogleRedirecting(false);
          return;
        } catch (tokenError) {
          logError('LoginPage', 'Stored token recovery failed', { error: tokenError instanceof Error ? tokenError.message : 'unknown_error' });
        }
      }

      setError('Google sign-in did not complete. Please try again.');
      setIsGoogleRedirecting(false);
      logError('LoginPage', 'Google auth flow failed', { error: err instanceof Error ? err.message : 'unknown_error' });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      logInfo('LoginPage', 'Email login submitted', { email });
      await login(email, password);
      navigate('/wal', { replace: true });
    } catch (err) {
      setError('Unable to sign in with the provided credentials.');
      setIsSubmitting(false);
      logError('LoginPage', 'Email login failed', { error: err instanceof Error ? err.message : 'unknown_error' });
    }
  };

  return (
    <CommandLayout>
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 px-8 py-10 space-y-8">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SecureShield</p>
          <h1 className="text-2xl font-semibold text-slate-900">Sign in to your account</h1>
          <p className="text-sm text-slate-500">Use your work email and password to continue.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting || isGoogleRedirecting}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold tracking-wide text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGoogleRedirecting ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="name@company.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isGoogleRedirecting}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="text-center text-sm text-slate-600">
          <span>Need an account? </span>
          <Link to="/register" className="font-semibold text-slate-900 hover:underline">
            Create one
          </Link>
        </div>
      </div>
    </CommandLayout>
  );
}
