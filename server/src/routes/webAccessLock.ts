import { Router, Request, Response, NextFunction } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

const router = Router();

interface EmailRequestBody {
  email?: string;
  site?: string;
  state?: number;
}

interface EmailRequest extends Request {
  body: EmailRequestBody;
  userId?: number;
  userEmail?: string;
}

interface LockedSiteRow extends RowDataPacket {
  site: string;
}

async function getUserFromEmail(req: EmailRequest, res: Response, next: NextFunction) {
  try {
    const email = req.body.email?.toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.userId = Number(user.id);
    req.userEmail = String(user.email);
    next();
  } catch (error) {
    console.error('getUserFromEmail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

router.post('/list', getUserFromEmail, async (req: EmailRequest, res: Response) => {
  try {
    const [rows] = await pool.query<LockedSiteRow[]>(
      'SELECT site FROM locked_sites WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json({ sites: rows.map((row) => ({ site: row.site })) });
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/state', getUserFromEmail, async (req: EmailRequest, res: Response) => {
  try {
    const site = req.body.site;
    if (!site) {
      return res.status(400).json({ error: 'Site is required' });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT site FROM locked_sites WHERE user_id = ? AND site = ?',
      [req.userId, site]
    );

    if (!rows.length) {
      return res.json({ isLocked: false, state: null });
    }

    res.json({ isLocked: true, siteData: { site: rows[0].site } });
  } catch (error) {
    console.error('Get site state error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/add', getUserFromEmail, async (req: EmailRequest, res: Response) => {
  try {
    const site = req.body.site;
    if (!site) {
      return res.status(400).json({ error: 'Site is required' });
    }

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT site FROM locked_sites WHERE user_id = ? AND site = ?',
      [req.userId, site]
    );

    if (existing.length) {
      return res.status(409).json({ error: 'Site already locked' });
    }

    await pool.query<ResultSetHeader>(
      'INSERT INTO locked_sites (user_id, site) VALUES (?, ?) ON DUPLICATE KEY UPDATE site = site',
      [req.userId, site]
    );

    res.status(201).json({
      message: 'Site locked successfully',
      site: { site }
    });
  } catch (error) {
    console.error('Add site error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/update-state', getUserFromEmail, async (req: EmailRequest, res: Response) => {
  try {
    const { site, state } = req.body;
    if (!site || state === undefined) {
      return res.status(400).json({ error: 'Site and state are required' });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT site FROM locked_sites WHERE user_id = ? AND site = ?',
      [req.userId, site]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.json({
      message: 'Site state should be updated in cache',
      site: { site: rows[0].site }
    });
  } catch (error) {
    console.error('Update state error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/remove', getUserFromEmail, async (req: EmailRequest, res: Response) => {
  try {
    const site = req.body.site;
    if (!site) {
      return res.status(400).json({ error: 'Site is required' });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT site FROM locked_sites WHERE user_id = ? AND site = ?',
      [req.userId, site]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Site not found' });
    }

    await pool.query<ResultSetHeader>(
      'DELETE FROM locked_sites WHERE user_id = ? AND site = ?',
      [req.userId, site]
    );

    res.json({ message: 'Site removed successfully' });
  } catch (error) {
    console.error('Remove site error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;