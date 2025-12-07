import { RowDataPacket } from 'mysql2';

export interface UserRecord extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string | null;
  pin_hash: string | null;
  google_id: string | null;
  google_avatar: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  timezone?: string | null;
  notifications_email?: number | boolean | null;
  notifications_browser?: number | boolean | null;
  auto_lock_new_tabs?: number | boolean | null;
  auto_sync_interval?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SafeUser {
  id: number;
  email: string;
  hasPin: boolean;
  avatarUrl: string | null;
  displayName: string | null;
  timezone: string;
}
