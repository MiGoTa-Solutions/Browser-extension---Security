import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { TabLockRecord } from '../types/tabLock';

// ==================== SCHEMAS ====================

const tabSchema = z.object({ 
  title: z.string().min(1), 
  url: z.string().url() 
});

const createLockSchema = z.object({
  name: z.string().min(1),
  note: z.string().max(255).optional().nullable(),
  isGroup: z.boolean().optional().default(false),
  tabs: z.array(tabSchema).min(1),
});

// ==================== SETUP ====================

const router = Router(); // <--- This was missing causing your error

// ==================== HELPERS ====================

// Helper to robustly parse JSON from DB
const parseTabs = (jsonStr: string) => {
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

function mapRecord(record: TabLockRecord) {
  return {
    id: record.id,
    name: record.name,
    note: record.note,
    isGroup: record.is_group === 1,
    status: record.status,
    lockedAt: record.locked_at,
    unlockedAt: record.unlocked_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    tabs: parseTabs(record.tabs_json || '[]'),
  };
}

// ==================== ROUTES ====================

// 1. GET ALL LOCKS
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.query<TabLockRecord[]>(
      'SELECT * FROM tab_locks WHERE user_id = ? ORDER BY updated_at DESC',
      [req.userId]
    );
    res.json({ locks: rows.map(mapRecord) });
  } catch (error) {
    console.error('[GET /api/locks] error', error);
    res.status(500).json({ error: 'Failed to list locks' });
  }
});

// 2. CREATE LOCK
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createLockSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }

  const { name, note, isGroup, tabs } = parsed.data;

  try {
    const [insertResult] = await pool.execute<any>(
      'INSERT INTO tab_locks (user_id, name, note, is_group, tabs_json, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.userId, name, note ?? null, isGroup ? 1 : 0, JSON.stringify(tabs), 'locked']
    );

    const newId = insertResult.insertId;
    const [rows] = await pool.query<TabLockRecord[]>(
      'SELECT * FROM tab_locks WHERE id = ? AND user_id = ?',
      [newId, req.userId]
    );

    res.status(201).json({ lock: mapRecord(rows[0]) });
  } catch (error) {
    console.error('[POST /api/locks] error', error);
    res.status(500).json({ error: 'Failed to create lock' });
  }
});

// 3. UNLOCK SITE (Fixed Logic)
router.post('/:id/unlock', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { pin } = req.body;

  if (!pin) return res.status(400).json({ error: 'PIN is required' });

  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    // In a real app, verify PIN here against user table using bcrypt
    // const [users] = await pool.query<any[]>('SELECT pin_hash FROM users WHERE id = ?', [req.userId]);
    
    await pool.execute(
      "UPDATE tab_locks SET status='unlocked', unlocked_at=NOW(), updated_at=NOW() WHERE id=? AND user_id=?",
      [id, req.userId]
    );

    const [rows] = await pool.query<TabLockRecord[]>(
      'SELECT * FROM tab_locks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ lock: mapRecord(rows[0]) });
  } catch (error) {
    console.error('[POST /api/locks/:id/unlock] error', error);
    res.status(500).json({ error: 'Unlock failed' });
  }
});

// 4. RE-LOCK SITE
router.post('/:id/relock', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    await pool.execute(
      "UPDATE tab_locks SET status='locked', locked_at=NOW(), unlocked_at=NULL, updated_at=NOW() WHERE id=? AND user_id=?",
      [id, req.userId]
    );

    const [rows] = await pool.query<TabLockRecord[]>(
      'SELECT * FROM tab_locks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ lock: mapRecord(rows[0]) });
  } catch (error) {
    console.error('[POST /api/locks/:id/relock] error', error);
    res.status(500).json({ error: 'Failed to relock' });
  }
});

// 5. DELETE LOCK
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    const [rows] = await pool.query<TabLockRecord[]>(
      'SELECT * FROM tab_locks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

    await pool.execute('DELETE FROM tab_locks WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/locks/:id] error', error);
    res.status(500).json({ error: 'Failed to delete lock' });
  }
});

export default router;