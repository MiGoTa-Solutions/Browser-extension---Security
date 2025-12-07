import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CommandLayout } from '../components/CommandLayout';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { GOOGLE_ERROR_MESSAGE, GOOGLE_TOKEN_MESSAGE } from '../utils/googleBridge';
import { EXTENSION_ID } from '../utils/extensionApi';
import { logError, logInfo } from '../utils/logger';

export function AuthGoogleCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeTokenLogin, user } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processedTokenRef = useRef<string | null>(null);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const pendingToken = params.get('token');
  const oauthError = params.get('error');

  useEffect(() => {
    if (user) {
      logInfo('GoogleCallback', 'User authenticated, redirecting to dashboard');
      navigate('/wal', { replace: true });
      return;
    }

    if (oauthError && !pendingToken) {
      logError('GoogleCallback', 'Received oauth error from provider', { error: oauthError });
      notifyOpenerOfError(oauthError);
      setErrorMessage('Google sign-in was cancelled. Please try again.');
      return;
    }

    if (!pendingToken) {
      logError('GoogleCallback', 'Missing token in callback');
      notifyOpenerOfError('missing_token');
      setErrorMessage('We could not finish Google sign-in. Missing token.');
      return;
    }

    if (processedTokenRef.current === pendingToken) {
      // Avoid reprocessing the same token repeatedly (prevents infinite loops)
      return;
    }
    processedTokenRef.current = pendingToken;

    let cancelled = false;

    const complete = async () => {
      try {
        logInfo('GoogleCallback', 'Completing login with callback token');
        await completeTokenLogin(pendingToken);
        notifyOpenerOfSuccess(pendingToken);
        if (!cancelled) {
          navigate('/wal', { replace: true });
        }
      } catch (error) {
        logError('GoogleCallback', 'Failed to finalize Google sign-in', { error: error instanceof Error ? error.message : 'unknown_error' });
        if (!cancelled) {
          setErrorMessage('We were unable to verify your Google account. Please try again.');
        }
        notifyOpenerOfError('verification_failed');
      }
    };

    complete();

    return () => {
      cancelled = true;
    };
  }, [completeTokenLogin, navigate, pendingToken, oauthError, user]);

  const renderContent = () => {
    if (errorMessage) {
      return (
        <div className="space-y-4 text-center">
          <p className="text-sm text-red-600">{errorMessage}</p>
          <Link to="/login" className="text-sm font-semibold text-slate-900 underline">
            Return to sign in
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Spinner size="lg" />
        <div>
          <p className="text-sm font-semibold text-slate-900">Finishing Google sign-in…</p>
          <p className="text-xs text-slate-500">Please hold while we secure your session.</p>
        </div>
      </div>
    );
  };

  return (
    <CommandLayout>
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 px-8 py-10">
        {renderContent()}
      </div>
    </CommandLayout>
  );
}

function notifyOpenerOfSuccess(token: string) {
  if (typeof window === 'undefined') {
    return;
  }

  let notified = false;

  if (window.opener) {
    try {
      window.opener.postMessage({ type: GOOGLE_TOKEN_MESSAGE, token }, '*');
      notified = true;
    } catch (error) {
      console.warn('Unable to notify extension opener about Google success', error);
    }
  }

  if (!notified && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage && EXTENSION_ID) {
    chrome.runtime.sendMessage(EXTENSION_ID, { type: GOOGLE_TOKEN_MESSAGE, token }, () => void 0);
  }

  setTimeout(() => {
    try {
      window.close();
    } catch {
      /* ignore */
    }
  }, 100);
}

function notifyOpenerOfError(reason: string) {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.opener) {
    try {
      window.opener.postMessage({ type: GOOGLE_ERROR_MESSAGE, error: reason }, '*');
    } catch (error) {
      console.warn('Unable to notify extension opener about Google failure', error);
    }
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage && EXTENSION_ID) {
    chrome.runtime.sendMessage(EXTENSION_ID, { type: GOOGLE_ERROR_MESSAGE, error: reason }, () => void 0);
  }
}
