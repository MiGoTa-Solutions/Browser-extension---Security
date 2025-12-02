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

// GET /api/locks - List all locked sites
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.query<TabLockRow[]>(
      'SELECT id, url, lock_name, is_locked, created_at FROM tab_locks WHERE user_id = ? ORDER BY created_at DESC', 
      [req.userId]
    );
    
    const locks = rows.map(row => ({
      ...row,
      is_locked: Boolean(row.is_locked)
    }));

    res.json({ locks });
  } catch (error) {
    console.error('List locks error:', error);
    res.status(500).json({ error: 'Failed to fetch locked sites' });
  }
});

// PATCH /api/locks/:id/status - Toggle Lock Status (NEW ROUTE)
router.patch('/:id/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { is_locked } = req.body;
  
  if (typeof is_locked !== 'boolean') {
    return res.status(400).json({ error: 'is_locked must be a boolean' });
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE tab_locks SET is_locked = ? WHERE id = ? AND user_id = ?',
      [is_locked, req.params.id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lock not found' });
    }

    res.json({ success: true, is_locked });
  } catch (error) {
    console.error('Update lock status error:', error);
    res.status(500).json({ error: 'Failed to update lock status' });
  }
});

// POST /api/locks - Add a new lock
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = lockSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  let { url, name } = parsed.data;
  url = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();

  try {
    const [existing] = await pool.query<TabLockRow[]>(
      'SELECT id, is_locked FROM tab_locks WHERE user_id = ? AND url = ?',
      [req.userId, url]
    );

    if (existing.length > 0) {
      const lock = existing[0];
      
      if (lock.is_locked) {
        return res.status(409).json({ error: 'This site is already locked.' });
      } else {
        await pool.execute(
          'UPDATE tab_locks SET is_locked = true, created_at = NOW() WHERE id = ?',
          [lock.id]
        );
        
        return res.status(200).json({ 
          success: true, 
          message: 'Site re-locked successfully',
          lock: { 
            id: lock.id, 
            url, 
            lock_name: name || url, 
            is_locked: true, 
            created_at: new Date().toISOString() 
          } 
        });
      }
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO tab_locks (user_id, url, lock_name, is_locked) VALUES (?, ?, ?, true)',
      [req.userId, url, name || url]
    );
    
    res.status(201).json({ 
      success: true, 
      lock: {
        id: result.insertId,
        url,
        lock_name: name || url,
        is_locked: true,
        created_at: new Date().toISOString()
      }
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
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM tab_locks WHERE id = ? AND user_id = ?', 
      [req.params.id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lock not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete lock error:', error);
    res.status(500).json({ error: 'Failed to remove lock' });
  }
});

export default router;