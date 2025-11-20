import { RowDataPacket } from 'mysql2';

export type TabLockStatus = 'locked' | 'unlocked';

export interface TabInfoPayload {
  title: string;
  url: string;
}

export interface TabLockRecord extends RowDataPacket {
  id: number;
  user_id: number;
  name: string;
  note: string | null;
  is_group: 0 | 1;
  tabs_json: string | null;
  status: TabLockStatus;
  locked_at: string;
  unlocked_at: string | null;
  created_at: string;
  updated_at: string;
}
