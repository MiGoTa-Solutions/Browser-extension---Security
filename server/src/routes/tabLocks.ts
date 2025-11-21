import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';

const router = Router();

// Validation Schema
const lockSchema = z.object({
  name: z.string().min(1),
  tabs: z.array(z.object({
    title: z.string(),
    url: z.string()
  })),
  pin: z.string().min(4)
});

// 1. GET ALL LOCKS
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Fetch locks that are currently active ('locked')
    const [rows] = await pool.query(
      "SELECT id, name, tabs_json, status, pin FROM tab_locks WHERE user_id = ? AND status = 'locked'",
      [req.userId]
    );
    
    const locks = (rows as any[]).map(row => {
      let domains = [];
      try {
        // Handle both string JSON and pre-parsed JSON object
        const tabsData = typeof row.tabs_json === 'string' ? JSON.parse(row.tabs_json) : row.tabs_json;
        domains = Array.isArray(tabsData) ? tabsData.map((t: any) => t.url) : [];
      } catch (e) {
        console.warn(`[TabLocks] Failed to parse tabs for lock ${row.id}`);
      }

      return {
        id: row.id,
        name: row.name,
        domains: domains,
        hasPin: !!row.pin // Tell frontend/extension that a PIN exists
      };
    });

    res.json({ success: true, locks });
  } catch (error) {
    console.error('GET /locks error:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// 2. CREATE NEW LOCK
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const result = lockSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input data', details: result.error });
  }

  const { name, tabs, pin } = result.data;

  try {
    await pool.execute(
      'INSERT INTO tab_locks (user_id, name, tabs_json, pin, status, locked_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [req.userId, name, JSON.stringify(tabs), pin, 'locked']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('POST /locks error:', error);
    res.status(500).json({ success: false, error: 'Failed to create lock' });
  }
});

// 3. UNLOCK A SITE
router.post('/:id/unlock', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { pin } = req.body;
  const lockId = req.params.id;

  if (!pin) return res.status(400).json({ error: 'PIN is required' });

  try {
    const [rows] = await pool.query('SELECT pin FROM tab_locks WHERE id = ? AND user_id = ?', [lockId, req.userId]);
    const lock = (rows as any[])[0];

    if (!lock) return res.status(404).json({ error: 'Lock not found' });
    
    // Check PIN
    if (lock.pin !== pin) {
      return res.status(401).json({ success: false, error: 'Incorrect PIN' });
    }

    // Update status to unlocked
    await pool.execute(
      "UPDATE tab_locks SET status = 'unlocked', unlocked_at = NOW() WHERE id = ?", 
      [lockId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('POST /unlock error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;  