import { Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { TabLockRecord } from '../types/tabLock';
import { UserRecord } from '../types/user';

const router = Router();

// Async error wrapper
const asyncHandler = (fn: Function) => (req: AuthenticatedRequest, res: Response, next: Function) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function httpError(statusCode: number, message: string) {
  const error = new Error(message);
  (error as Error & { statusCode?: number }).statusCode = statusCode;
  return error;
}

const tabSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
});

const createLockSchema = z.object({
  name: z.string().min(2).max(120),
  note: z.string().max(255).optional(),
  isGroup: z.boolean().default(false),
  tabs: z.array(tabSchema).min(1),
  pin: z.string().min(4).max(12),
});

const pinSchema = z.object({
  pin: z.string().min(4).max(12),
});

function mapLock(record: TabLockRecord) {
  let tabs = [] as Array<{ title: string; url: string }>;
  if (record.tabs_json) {
    try {
      tabs = JSON.parse(record.tabs_json);
    } catch (error) {
      tabs = [];
    }
  }

  return {
    id: record.id,
    name: record.name,
    note: record.note ?? undefined,
    isGroup: Boolean(record.is_group),
    status: record.status,
    tabs,
    lockedAt: record.locked_at,
    unlockedAt: record.unlocked_at ?? undefined,
  };
}

async function getLockOr404(lockId: number, userId: number) {
  const [rows] = await pool.query<TabLockRecord[]>(
    'SELECT * FROM tab_locks WHERE id = ? AND user_id = ?',
    [lockId, userId]
  );

  const lock = rows[0];

  if (!lock) {
    throw httpError(404, 'Lock not found');
  }

  return lock;
}

async function validatePin(userId: number, pin: string) {
  const [rows] = await pool.query<UserRecord[]>(
    'SELECT pin_hash FROM users WHERE id = ?',
    [userId]
  );

  const user = rows[0];

  if (!user?.pin_hash) {
    throw httpError(400, 'PIN not set');
  }

  const matches = await bcrypt.compare(pin, user.pin_hash);

  if (!matches) {
    throw httpError(401, 'Incorrect PIN');
  }
}

router.use(requireAuth);

router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const [rows] = await pool.query<TabLockRecord[]>(
    'SELECT * FROM tab_locks WHERE user_id = ? ORDER BY created_at DESC',
    [req.userId]
  );

  res.json({ locks: rows.map(mapLock) });
}));

router.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createLockSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }

  const { pin, ...payload } = parsed.data;
  await validatePin(req.userId!, pin);
  const tabsJson = JSON.stringify(payload.tabs.slice(0, 20));

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO tab_locks (user_id, name, note, is_group, tabs_json, status)
     VALUES (?, ?, ?, ?, ?, 'locked')`,
    [req.userId, payload.name, payload.note ?? null, payload.isGroup ? 1 : 0, tabsJson]
  );

  const lock = await getLockOr404(result.insertId, req.userId!);

  res.status(201).json({ lock: mapLock(lock) });
}));

router.post('/:lockId/unlock', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = pinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }

  const lockId = Number(req.params.lockId);
  await validatePin(req.userId!, parsed.data.pin);
  await getLockOr404(lockId, req.userId!);

  await pool.execute(
    `UPDATE tab_locks SET status = 'unlocked', unlocked_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
    [lockId, req.userId]
  );

  const lock = await getLockOr404(lockId, req.userId!);
  res.json({ lock: mapLock(lock) });
}));

router.post('/:lockId/relock', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = pinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }

  const lockId = Number(req.params.lockId);
  await validatePin(req.userId!, parsed.data.pin);
  await getLockOr404(lockId, req.userId!);

  await pool.execute(
    `UPDATE tab_locks SET status = 'locked', locked_at = CURRENT_TIMESTAMP, unlocked_at = NULL WHERE id = ? AND user_id = ?`,
    [lockId, req.userId]
  );

  const lock = await getLockOr404(lockId, req.userId!);
  res.json({ lock: mapLock(lock) });
}));

router.delete('/:lockId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = pinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }

  const lockId = Number(req.params.lockId);
  await validatePin(req.userId!, parsed.data.pin);
  await getLockOr404(lockId, req.userId!);

  await pool.execute('DELETE FROM tab_locks WHERE id = ? AND user_id = ?', [lockId, req.userId]);

  res.json({ success: true });
}));

export default router;
