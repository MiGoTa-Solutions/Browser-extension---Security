import { Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import { AuthenticatedRequest } from './requireAuth';

interface PinRow extends RowDataPacket {
  pin_hash: string | null;
}

export async function requireMasterPin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const [rows] = await pool.query<PinRow[]>(
      'SELECT pin_hash FROM users WHERE id = ? LIMIT 1',
      [req.userId]
    );
    const user = rows[0];

    if (!user?.pin_hash) {
      return res.status(403).json({ error: 'Set your master PIN to manage locked sites.' });
    }

    next();
  } catch (error) {
    console.error('[requireMasterPin] verification failed', error);
    res.status(500).json({ error: 'Unable to verify master PIN status' });
  }
}