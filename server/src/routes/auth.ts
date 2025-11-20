import { Request, Response, Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import { signToken } from '../utils/jwt';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { SafeUser, UserRecord } from '../types/user';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  pin: z.string().min(4).max(12).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const pinSchema = z.object({
  pin: z.string().min(4).max(12),
});

function mapToSafeUser(record: UserRecord): SafeUser {
  return {
    id: record.id,
    email: record.email,
    hasPin: Boolean(record.pin_hash),
  };
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
    }

    const { email, password, pin } = parsed.data;

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
    const token = signToken(userId);

    return res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        hasPin: Boolean(pinHash),
      },
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

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user.id);
    return res.json({ token, user: mapToSafeUser(user) });
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

    return res.json({ user: mapToSafeUser(user) });
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

export default router;
