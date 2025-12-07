import { ChangeEvent, FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CommandLayout } from '../components/CommandLayout';
import { useAuth } from '../context/AuthContext';
import { startGoogleAuthFlow, startExtensionGoogleAuthFlow } from '../services/api';
import { isExtensionContext } from '../utils/extensionApi';
import { waitForAuthToken } from '../utils/chromeStorage';
import { logError, logInfo, logWarn } from '../utils/logger';

const MAX_AVATAR_BYTES = 250 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function Register() {
  const navigate = useNavigate();
  const { register, completeTokenLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignup = async () => {
    setError(null);
    setIsGoogleRedirecting(true);

    try {
      const context = isExtensionContext() ? 'extension' : 'web';
      logInfo('RegisterPage', 'Google sign-up started', { context });

      if (context === 'extension') {
        logInfo('RegisterPage', 'Starting extension Google sign-up');
        const token = await startExtensionGoogleAuthFlow();
        await completeTokenLogin(token);
        logInfo('RegisterPage', 'Extension Google sign-up completed');
        navigate('/wal', { replace: true });
        setIsGoogleRedirecting(false);
      } else {
        logInfo('RegisterPage', 'Redirecting to Google sign-up (web)');
        startGoogleAuthFlow();
      }
    } catch (err) {
      const fallbackToken = await waitForAuthToken();
      if (fallbackToken) {
        try {
          logWarn('RegisterPage', 'Popup reported error but token detected, attempting recovery');
          await completeTokenLogin(fallbackToken);
          navigate('/wal', { replace: true });
          logInfo('RegisterPage', 'Recovered Google sign-up via stored token');
          setIsGoogleRedirecting(false);
          return;
        } catch (tokenError) {
          logError('RegisterPage', 'Stored token recovery failed', { error: tokenError instanceof Error ? tokenError.message : 'unknown_error' });
        }
      }

      setError('Google account linking did not complete. Please try again.');
      setIsGoogleRedirecting(false);
      logError('RegisterPage', 'Google sign-up failed', { error: err instanceof Error ? err.message : 'unknown_error' });
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    const file = files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file.');
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Choose an image smaller than 250KB.');
      return;
    }

    try {
      const dataUrl = await fileToBase64(file);
      setAvatarData(dataUrl);
      setAvatarPreview(dataUrl);
      setAvatarError(null);
    } catch (err) {
      console.error(err);
      setAvatarError('We could not read that image. Try another file.');
    }
  };

  const clearAvatar = () => {
    setAvatarData(null);
    setAvatarPreview(null);
    setAvatarError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      logInfo('RegisterPage', 'Submitting registration form', { email });
      await register({ email, password, pin: accessCode, avatarData: avatarData ?? undefined });
      navigate('/wal', { replace: true });
    } catch (err) {
      setError('We could not create your account with the provided information.');
      setIsSubmitting(false);
      logError('RegisterPage', 'Registration failed', { error: err instanceof Error ? err.message : 'unknown_error' });
    }
  };

  return (
    <CommandLayout>
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 px-8 py-10 space-y-8">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SecureShield</p>
          <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500">Provide your information to request access.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignup}
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

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="accessCode" className="text-sm font-medium text-slate-700">
              Access code
            </label>
            <input
              id="accessCode"
              type="text"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              required
              placeholder="SEC-0000"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="avatarUpload">
              Profile photo (optional)
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <img
                  src={avatarPreview ?? '/icons/icon128.png'}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 space-y-2">
                <input
                  id="avatarUpload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                />
                {avatarError ? (
                  <p className="text-xs text-red-600">{avatarError}</p>
                ) : (
                  <p className="text-xs text-slate-500">
                    PNG or JPG up to 250KB. We'll show this photo across the dashboard.
                  </p>
                )}
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={clearAvatar}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isGoogleRedirecting}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="text-center text-sm text-slate-600">
          <span>Already have access? </span>
          <Link to="/login" className="font-semibold text-slate-900 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </CommandLayout>
  );
}
