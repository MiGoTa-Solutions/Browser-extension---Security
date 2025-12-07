import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { buildProfilePayload, ensureUserSettingsRow, fetchUserWithSettings } from '../utils/userProfile';

const router = Router();

const dataUrlPattern = /^data:image\/(png|jpe?g|webp|gif);base64,/i;

const avatarUrlSchema = z
  .string()
  .max(250000, 'Avatar must be smaller than 250KB')
  .refine((value) => isHttpUrl(value) || dataUrlPattern.test(value), {
    message: 'Avatar must be a valid image URL or inline image data URL',
  });

const settingsSchema = z.object({
  displayName: z.string().min(2).max(100).nullable().optional(),
  avatarUrl: avatarUrlSchema.nullable().optional(),
  timezone: z.string().max(64).optional(),
  notificationsEmail: z.boolean().optional(),
  notificationsBrowser: z.boolean().optional(),
  autoLockNewTabs: z.boolean().optional(),
  autoSyncInterval: z.number().int().min(1).max(60).optional(),
});

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    await ensureUserSettingsRow(req.userId);
    const record = await fetchUserWithSettings(req.userId);

    if (!record) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(buildProfilePayload(record));
  } catch (error) {
    console.error('[GET /profile] failed', error);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.put('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }

  const updates = parsed.data;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No changes submitted' });
  }

  try {
    await ensureUserSettingsRow(req.userId);

    const fields: string[] = [];
    const values: Array<string | number | boolean | null> = [];

    if ('displayName' in updates) {
      fields.push('display_name = ?');
      values.push(updates.displayName ?? null);
    }
    if ('avatarUrl' in updates) {
      fields.push('avatar_url = ?');
      values.push(updates.avatarUrl ?? null);
    }
    if (updates.timezone !== undefined) {
      fields.push('timezone = ?');
      values.push(updates.timezone);
    }
    if (updates.notificationsEmail !== undefined) {
      fields.push('notifications_email = ?');
      values.push(updates.notificationsEmail);
    }
    if (updates.notificationsBrowser !== undefined) {
      fields.push('notifications_browser = ?');
      values.push(updates.notificationsBrowser);
    }
    if (updates.autoLockNewTabs !== undefined) {
      fields.push('auto_lock_new_tabs = ?');
      values.push(updates.autoLockNewTabs);
    }
    if (updates.autoSyncInterval !== undefined) {
      fields.push('auto_sync_interval = ?');
      values.push(updates.autoSyncInterval);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No supported fields submitted' });
    }

    values.push(req.userId);

    await pool.execute(
      `UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );

    const record = await fetchUserWithSettings(req.userId);

    if (!record) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(buildProfilePayload(record));
  } catch (error) {
    console.error('[PUT /profile] failed', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default router;
