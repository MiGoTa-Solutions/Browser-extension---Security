import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

const lockSchema = z.object({
  url: z.string().min(1, "URL is required"),
  name: z.string().optional()
});

interface TabLockRow extends RowDataPacket {
  id: number;
  user_id: number;
  url: string;
  lock_name: string;
  is_locked: number;
  created_at: string;
}

// GET /api/locks - List all locks
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.query<TabLockRow[]>(
      'SELECT id, url, lock_name, is_locked, created_at FROM tab_locks WHERE user_id = ? ORDER BY created_at DESC', 
      [req.userId]
    );
    const locks = rows.map(row => ({ ...row, is_locked: Boolean(row.is_locked) }));
    res.json({ locks });
  } catch (error) {
    console.error('List locks error:', error);
    res.status(500).json({ error: 'Failed to fetch locked sites' });
  }
});

// POST /api/locks - Add a lock
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = lockSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  let { url, name } = parsed.data;
  // Normalize URL
  url = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO tab_locks (user_id, url, lock_name, is_locked) VALUES (?, ?, ?, true)',
      [req.userId, url, name || url]
    );
    res.status(201).json({ 
      success: true, 
      lock: { id: result.insertId, url, lock_name: name || url, is_locked: true, created_at: new Date().toISOString() }
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This site is already locked' });
    }
    console.error('Add lock error:', error);
    res.status(500).json({ error: 'Failed to lock site' });
  }
});

// DELETE /api/locks/:id - Remove a lock
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await pool.execute('DELETE FROM tab_locks WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete lock error:', error);
    res.status(500).json({ error: 'Failed to remove lock' });
  }
});

export default router;