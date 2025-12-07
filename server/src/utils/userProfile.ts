import { pool } from '../config/database';
import { UserRecord, SafeUser } from '../types/user';

export type ProfileRecord = UserRecord & {
  display_name: string | null;
  avatar_url: string | null;
  timezone: string | null;
  notifications_email: number | boolean | null;
  notifications_browser: number | boolean | null;
  auto_lock_new_tabs: number | boolean | null;
  auto_sync_interval: number | null;
};

export interface UserSettingsPayload {
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  notificationsEmail: boolean;
  notificationsBrowser: boolean;
  autoLockNewTabs: boolean;
  autoSyncInterval: number;
}

export interface UserProfilePayload {
  user: SafeUser;
  settings: UserSettingsPayload;
}

export async function ensureUserSettingsRow(userId: number | undefined) {
  if (!userId) return;
  await pool.execute(
    'INSERT INTO user_settings (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id',
    [userId]
  );
}

export async function fetchUserWithSettings(userId: number): Promise<ProfileRecord | null> {
  const [rows] = await pool.query<ProfileRecord[]>(
    `SELECT u.*, s.display_name, s.avatar_url, s.timezone,
            s.notifications_email, s.notifications_browser,
            s.auto_lock_new_tabs, s.auto_sync_interval
       FROM users u
       LEFT JOIN user_settings s ON s.user_id = u.id
      WHERE u.id = ?
      LIMIT 1`,
    [userId]
  );

  return rows[0] ?? null;
}

export function mapToSafeUser(record: UserRecord | ProfileRecord): SafeUser {
  const enriched = record as Partial<ProfileRecord>;
  return {
    id: record.id,
    email: record.email,
    hasPin: Boolean(record.pin_hash),
    avatarUrl: enriched.avatar_url ?? record.google_avatar ?? null,
    displayName: enriched.display_name ?? null,
    timezone: enriched.timezone ?? 'UTC',
  };
}

export function mapToSettings(record: ProfileRecord): UserSettingsPayload {
  return {
    displayName: record.display_name ?? null,
    avatarUrl: record.avatar_url ?? record.google_avatar ?? null,
    timezone: record.timezone ?? 'UTC',
    notificationsEmail:
      record.notifications_email === null || record.notifications_email === undefined
        ? true
        : Boolean(record.notifications_email),
    notificationsBrowser:
      record.notifications_browser === null || record.notifications_browser === undefined
        ? true
        : Boolean(record.notifications_browser),
    autoLockNewTabs:
      record.auto_lock_new_tabs === null || record.auto_lock_new_tabs === undefined
        ? true
        : Boolean(record.auto_lock_new_tabs),
    autoSyncInterval: record.auto_sync_interval ?? 5,
  };
}

export function buildProfilePayload(record: ProfileRecord): UserProfilePayload {
  return {
    user: mapToSafeUser(record),
    settings: mapToSettings(record),
  };
}