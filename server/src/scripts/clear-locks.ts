import * as dotenv from 'dotenv';
import { pool } from '../config/database';

// Load environment variables from .env file
dotenv.config();

async function clearAllLocks() {
  try {
    console.log('🗑️  Clearing all tab locks from database...');
    
    const [result]: any = await pool.execute('DELETE FROM tab_locks');
    
    console.log(`✅ Successfully deleted ${result.affectedRows} lock(s)`);
    console.log('🧹 Database cleared!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing locks:', error);
    process.exit(1);
  }
}

clearAllLocks();
