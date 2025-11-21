import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';

const router = Router();

// Schema for robust validation
const lockSchema = z.object({
  name: z.string().min(1),
  tabs: z.array(z.object({
    title: z.string(),
    url: z.string()
  })),
  pin: z.string().min(4)
});

// 1. GET LOCKS (Standardized Response)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, tabs_json, status, pin FROM tab_locks WHERE user_id = ? AND status = 'locked'",
      [req.userId]
    );
    
    // Transform for the extension
    const locks = (rows as any[]).map(row => ({
      id: row.id,
      name: row.name,
      // Only send simple domain list to extension to save space
      domains: JSON.parse(row.tabs_json || '[]').map((t: any) => t.url),
      // We verify PIN on backend, but extension needs to know a PIN exists
      hasPin: !!row.pin
    }));

    res.json({ success: true, locks });
  } catch (error) {
    console.error('GET /locks error:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// 2. CREATE LOCK
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const result = lockSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Invalid data' });

  const { name, tabs, pin } = result.data;

  try {
    await pool.execute(
      'INSERT INTO tab_locks (user_id, name, tabs_json, pin, status) VALUES (?, ?, ?, ?, ?)',
      [req.userId, name, JSON.stringify(tabs), pin, 'locked']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('POST /locks error:', error);
    res.status(500).json({ success: false, error: 'Failed to create lock' });
  }
});

// 3. UNLOCK (Verify PIN)
router.post('/:id/unlock', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { pin } = req.body;
  const lockId = req.params.id;

  try {
    const [rows] = await pool.query('SELECT pin FROM tab_locks WHERE id = ? AND user_id = ?', [lockId, req.userId]);
    const lock = (rows as any[])[0];

    if (!lock) return res.status(404).json({ error: 'Lock not found' });
    
    // In production, verify hash. For now, direct comparison as per your setup.
    if (lock.pin !== pin) {
      return res.status(401).json({ success: false, error: 'Incorrect PIN' });
    }

    // Set status to unlocked
    await pool.execute("UPDATE tab_locks SET status = 'unlocked' WHERE id = ?", [lockId]);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;