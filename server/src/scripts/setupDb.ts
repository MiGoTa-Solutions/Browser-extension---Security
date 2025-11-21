import { pool } from '../config/database';

const setup = async () => {
  console.log('🔄 Initializing Database Schema...');

  try {
    // 1. Create Table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tab_locks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        tabs_json JSON,
        pin VARCHAR(255) NOT NULL,
        status ENUM('locked', 'unlocked') DEFAULT 'locked',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        locked_at TIMESTAMP NULL,
        unlocked_at TIMESTAMP NULL,
        INDEX idx_user (user_id)
      )
    `);
    console.log('✅ Table "tab_locks" verified.');

    // 2. Check for missing columns (Migration logic)
    const [columns] = await pool.query(`SHOW COLUMNS FROM tab_locks LIKE 'pin'`);
    if ((columns as any[]).length === 0) {
      console.log('⚠️ Column "pin" missing. Adding it now...');
      await pool.query(`ALTER TABLE tab_locks ADD COLUMN pin VARCHAR(255) NOT NULL DEFAULT ''`);
      console.log('✅ Column "pin" added.');
    }

  } catch (err) {
    console.error('❌ Database Setup Failed:', err);
  } finally {
    process.exit();
  }
};

setup();