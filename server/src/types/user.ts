import { RowDataPacket } from 'mysql2';

export interface UserRecord extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  pin_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafeUser {
  id: number;
  email: string;
  hasPin: boolean;
}
