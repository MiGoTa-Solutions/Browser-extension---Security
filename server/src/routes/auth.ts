import { Request, Response, Router } from 'express';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import { signToken } from '../utils/jwt';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { UserRecord } from '../types/user';
import { ensureUserSettingsRow, fetchUserWithSettings, mapToSafeUser } from '../utils/userProfile';

const router = Router();

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_SCOPES = ['openid', 'email', 'profile'];

const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  appBaseUrl: process.env.APP_BASE_URL?.replace(/\/$/, ''),
  successPath: process.env.GOOGLE_SUCCESS_PATH || '/#/auth/google',
};

const isGoogleConfigured = Boolean(
  googleConfig.clientId &&
  googleConfig.clientSecret &&
  googleConfig.redirectUri &&
  googleConfig.appBaseUrl
);

const googleClient = isGoogleConfigured
  ? new OAuth2Client(googleConfig.clientId, googleConfig.clientSecret, googleConfig.redirectUri)
  : null;

const defaultRedirectUrl = isGoogleConfigured && googleConfig.appBaseUrl
  ? buildRedirectUrl(googleConfig.appBaseUrl, googleConfig.successPath)
  : null;
const appBaseOrigin = googleConfig.appBaseUrl ? new URL(googleConfig.appBaseUrl).origin : null;

interface GoogleStatePayload {
  redirect?: string;
}

const dataUrlPattern = /^data:image\/(png|jpe?g|webp|gif);base64,/i;

const avatarUploadSchema = z
  .string()
  .max(250000, 'Avatar must be smaller than 250KB')
  .refine((value) => dataUrlPattern.test(value), {
    message: 'Avatar must be an inline image data URL',
  });

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  pin: z.string().min(4).max(12).optional(),
  avatarData: avatarUploadSchema.optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const pinSchema = z.object({
  pin: z.string().min(4).max(12),
});

const resetPinSchema = z.object({
  currentPin: z.string().min(4).max(12),
  newPin: z.string().min(4).max(12),
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
    }

    const { email, password, pin, avatarData } = parsed.data;

    const [existing] = await pool.query<UserRecord[]>('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const pinHash = pin ? await bcrypt.hash(pin, 10) : null;

    const [insertResult] = await pool.execute<ResultSetHeader>(
      'INSERT INTO users (email, password_hash, pin_hash) VALUES (?, ?, ?)',
      [email, passwordHash, pinHash]
    );

    const userId = insertResult.insertId;
    await ensureUserSettingsRow(userId);

    if (avatarData) {
      await pool.execute('UPDATE user_settings SET avatar_url = ? WHERE user_id = ?', [avatarData, userId]);
    }

    const profileRecord = await fetchUserWithSettings(userId);
    const safeUser = profileRecord
      ? mapToSafeUser(profileRecord)
      : {
          id: userId,
          email,
          hasPin: Boolean(pinHash),
          avatarUrl: avatarData ?? null,
          displayName: null,
          timezone: 'UTC',
        };

    const token = signToken(userId);

    return res.status(201).json({
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error('[/register] error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
    }

    const { email, password } = parsed.data;

    const [rows] = await pool.query<UserRecord[]>('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await ensureUserSettingsRow(user.id);
    const profileRecord = await fetchUserWithSettings(user.id);
    const safeUser = profileRecord ? mapToSafeUser(profileRecord) : mapToSafeUser(user);

    const token = signToken(user.id);
    return res.json({ token, user: safeUser });
  } catch (error) {
    console.error('[/login] error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.query<UserRecord[]>('SELECT * FROM users WHERE id = ?', [req.userId]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await ensureUserSettingsRow(user.id);
    const profileRecord = await fetchUserWithSettings(user.id);
    const safeUser = profileRecord ? mapToSafeUser(profileRecord) : mapToSafeUser(user);

    return res.json({ user: safeUser });
  } catch (error) {
    console.error('[/me] error:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/set-pin', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = pinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }

  const pinHash = await bcrypt.hash(parsed.data.pin, 10);
  await pool.execute('UPDATE users SET pin_hash = ? WHERE id = ?', [pinHash, req.userId]);

  return res.json({ success: true });
});

router.post('/verify-pin', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = pinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }

  const [rows] = await pool.query<UserRecord[]>('SELECT pin_hash FROM users WHERE id = ?', [req.userId]);
  const user = rows[0];

  if (!user?.pin_hash) {
    return res.status(400).json({ error: 'PIN not set' });
  }

  const matches = await bcrypt.compare(parsed.data.pin, user.pin_hash);

  if (!matches) {
    return res.status(401).json({ error: 'Incorrect PIN' });
  }

  return res.json({ success: true });
});

router.post('/reset-pin', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = resetPinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }

  const { currentPin, newPin } = parsed.data;

  const [rows] = await pool.query<UserRecord[]>('SELECT pin_hash FROM users WHERE id = ?', [req.userId]);
  const user = rows[0];

  if (!user?.pin_hash) {
    return res.status(400).json({ error: 'PIN not set' });
  }

  const matches = await bcrypt.compare(currentPin, user.pin_hash);
  if (!matches) {
    return res.status(401).json({ error: 'Incorrect PIN' });
  }

  const newPinHash = await bcrypt.hash(newPin, 10);
  await pool.execute('UPDATE users SET pin_hash = ? WHERE id = ?', [newPinHash, req.userId]);

  return res.json({ success: true });
});

router.get('/google/start', (req: Request, res: Response) => {
  if (!isGoogleConfigured || !googleClient || !googleConfig.redirectUri) {
    return res.status(503).json({ error: 'Google Sign-In not configured' });
  }

  const redirect = typeof req.query.redirect === 'string' ? req.query.redirect : undefined;
  const statePayload: GoogleStatePayload = {};
  if (redirect) {
    statePayload.redirect = redirect;
  }

  const params = new URLSearchParams({
    client_id: googleConfig.clientId!,
    redirect_uri: googleConfig.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    prompt: 'consent',
    access_type: 'offline',
  });

  const state = Object.keys(statePayload).length > 0 ? encodeStatePayload(statePayload) : null;
  if (state) {
    params.set('state', state);
  }

  return res.redirect(`${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`);
});

router.get('/google/callback', async (req: Request, res: Response) => {
  if (!isGoogleConfigured || !googleClient || !googleConfig.redirectUri || !defaultRedirectUrl) {
    return res.status(503).json({ error: 'Google Sign-In not configured' });
  }

  const statePayload = decodeStateParam(typeof req.query.state === 'string' ? req.query.state : undefined);
  const redirectTarget = sanitizeRedirectUrl(statePayload?.redirect);
  const redirectWithError = (message: string) => res.redirect(appendParamToRedirect(redirectTarget, 'error', message));

  if (typeof req.query.error === 'string') {
    return redirectWithError(req.query.error);
  }

  const code = typeof req.query.code === 'string' ? req.query.code : null;
  if (!code) {
    return redirectWithError('missing_code');
  }

  try {
    const tokenResponse = await googleClient.getToken(code);
    const { tokens } = tokenResponse;
    if (!tokens.id_token) {
      return redirectWithError('missing_id_token');
    }

    const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token, audience: googleConfig.clientId });
    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.sub) {
      return redirectWithError('invalid_profile');
    }

    if (payload.email_verified === false) {
      return redirectWithError('unverified_email');
    }

    const user = await findOrCreateGoogleUser(payload);
    const token = signToken(user.id);
    const successRedirect = appendParamToRedirect(redirectTarget, 'token', token);
    return res.redirect(successRedirect);
  } catch (error) {
    console.error('[/auth/google/callback] error:', error);
    return redirectWithError('oauth_error');
  }
});

function encodeStatePayload(payload: GoogleStatePayload): string {
  const buffer = Buffer.from(JSON.stringify(payload), 'utf8');
  return bufferToBase64Url(buffer);
}

function decodeStateParam(value?: string | null): GoogleStatePayload | null {
  if (!value) {
    return null;
  }

  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4;
    const padded = normalized + (pad ? '='.repeat(4 - pad) : '');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch (error) {
    console.warn('Failed to decode Google state payload', error);
    return null;
  }
}

function bufferToBase64Url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function sanitizeRedirectUrl(redirect?: string): string {
  if (!defaultRedirectUrl || !googleConfig.appBaseUrl || !appBaseOrigin) {
    return redirect || defaultRedirectUrl || '/';
  }

  if (!redirect) {
    return defaultRedirectUrl;
  }

  try {
    if (redirect.startsWith('#')) {
      return `${googleConfig.appBaseUrl}${redirect}`;
    }

    if (redirect.startsWith('/')) {
      return `${googleConfig.appBaseUrl}${redirect}`;
    }

    const candidate = new URL(redirect, googleConfig.appBaseUrl);
    return candidate.origin === appBaseOrigin ? candidate.toString() : defaultRedirectUrl;
  } catch {
    return defaultRedirectUrl;
  }
}

function appendParamToRedirect(targetUrl: string, key: string, value: string): string {
  const hashIndex = targetUrl.indexOf('#');

  if (hashIndex === -1) {
    try {
      const url = new URL(targetUrl);
      url.searchParams.set(key, value);
      return url.toString();
    } catch {
      return targetUrl;
    }
  }

  const base = targetUrl.substring(0, hashIndex);
  const hash = targetUrl.substring(hashIndex + 1);
  const [hashPath, hashQuery] = hash.split('?');
  const params = new URLSearchParams(hashQuery || '');
  params.set(key, value);
  const newHash = params.toString() ? `${hashPath}?${params.toString()}` : hashPath;
  return `${base}#${newHash}`;
}

function buildRedirectUrl(base: string, path?: string | null): string {
  if (!path) {
    return base;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (path.startsWith('#')) {
    return `${base}${path}`;
  }

  if (path.startsWith('/')) {
    return `${base}${path}`;
  }

  return `${base}/${path}`;
}

async function findOrCreateGoogleUser(profile: TokenPayload): Promise<UserRecord> {
  if (!profile.email || !profile.sub) {
    throw new Error('Google profile missing required fields');
  }

  const [rows] = await pool.query<UserRecord[]>(
    'SELECT * FROM users WHERE google_id = ? OR email = ? LIMIT 1',
    [profile.sub, profile.email]
  );

  const existing = rows[0];
  if (existing) {
    const needsUpdate = existing.google_id !== profile.sub || existing.google_avatar !== (profile.picture ?? null);
    if (needsUpdate) {
      await pool.execute(
        'UPDATE users SET google_id = ?, google_avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [profile.sub, profile.picture ?? null, existing.id]
      );

      const [updatedRows] = await pool.query<UserRecord[]>('SELECT * FROM users WHERE id = ?', [existing.id]);
      return updatedRows[0];
    }

    return existing;
  }

  const [insertResult] = await pool.execute<ResultSetHeader>(
    'INSERT INTO users (email, google_id, google_avatar) VALUES (?, ?, ?)',
    [profile.email, profile.sub, profile.picture ?? null]
  );

  const userId = insertResult.insertId;
  const [newRows] = await pool.query<UserRecord[]>('SELECT * FROM users WHERE id = ?', [userId]);
  const user = newRows[0];

  if (!user) {
    throw new Error('Failed to load user after insert');
  }

  return user;
}

export default router;
