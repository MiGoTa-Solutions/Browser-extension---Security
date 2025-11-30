/**
 * Clear All Locked Sites Script
 * 
 * FOR EDUCATIONAL/DEVELOPMENT PURPOSES ONLY
 * Removes all locked sites from the database
 * 
 * Usage: node clearAllLocks.js
 *        node clearAllLocks.js --confirm
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');
const readline = require('readline');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

const parsedUrl = new URL(databaseUrl);

const poolConfig = {
  host: parsedUrl.hostname,
  port: parseInt(parsedUrl.port || '3306', 10),
  user: decodeURIComponent(parsedUrl.username),
  password: decodeURIComponent(parsedUrl.password),
  database: parsedUrl.pathname.replace('/', '') || 'defaultdb',
  waitForConnections: true,
  connectionLimit: 10,
  ssl: parsedUrl.searchParams.get('ssl-mode')
    ? { rejectUnauthorized: false }
    : undefined,
};

const pool = mysql.createPool(poolConfig);

async function promptConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function getLocksCount() {
  const [result] = await pool.query('SELECT COUNT(*) as count FROM tab_locks');
  return result[0].count;
}

async function getLockedSitesCount() {
  const [result] = await pool.query("SELECT COUNT(*) as count FROM tab_locks WHERE is_locked = TRUE OR status = 'locked'");
  return result[0].count;
}

async function getAllLocks() {
  const [locks] = await pool.query(
    'SELECT id, user_id, url, lock_name, is_locked, status, created_at FROM tab_locks ORDER BY user_id, created_at DESC'
  );
  return locks;
}

async function clearAllLocks() {
  try {
    console.log('\n🗑️  CLEAR ALL LOCKED SITES');
    console.log('═'.repeat(80));
    
    // Get current statistics
    const totalCount = await getLocksCount();
    const lockedCount = await getLockedSitesCount();
    
    if (totalCount === 0) {
      console.log('\n✅ Database is already clean - no locks found');
      return;
    }

    console.log(`\n📊 Current Statistics:`);
    console.log(`   Total locks in database: ${totalCount}`);
    console.log(`   Currently locked sites:  ${lockedCount}`);
    
    // Show all locks
    const locks = await getAllLocks();
    console.log('\n📋 Locks to be deleted:');
    console.log('─'.repeat(80));
    
    const userLocks = {};
    locks.forEach((lock) => {
      if (!userLocks[lock.user_id]) {
        userLocks[lock.user_id] = [];
      }
      userLocks[lock.user_id].push(lock);
    });
    
    for (const [userId, userLockList] of Object.entries(userLocks)) {
      console.log(`\n👤 User ID ${userId} (${userLockList.length} locks):`);
      userLockList.forEach((lock, index) => {
        const status = lock.is_locked || lock.status === 'locked' ? '🔒 LOCKED' : '🔓 UNLOCKED';
        console.log(`   ${index + 1}. ${lock.url} - ${status} - ${lock.lock_name || '(unnamed)'}`);
      });
    }

    console.log('\n' + '═'.repeat(80));
    console.log('⚠️  WARNING: This action will permanently delete ALL lock records!');
    console.log('═'.repeat(80));
    
    // Check for --confirm flag
    const hasConfirmFlag = process.argv.includes('--confirm');
    
    let confirmed;
    if (hasConfirmFlag) {
      console.log('\n✓ Auto-confirmed via --confirm flag');
      confirmed = true;
    } else {
      confirmed = await promptConfirmation('\n❓ Are you sure you want to delete all locks? (yes/no): ');
    }
    
    if (!confirmed) {
      console.log('\n❌ Operation cancelled - no changes made');
      return;
    }

    // Perform deletion
    console.log('\n🔄 Deleting all locks...');
    const [result] = await pool.query('DELETE FROM tab_locks');
    
    console.log('\n✅ SUCCESS!');
    console.log('─'.repeat(80));
    console.log(`   Deleted ${result.affectedRows} lock record(s)`);
    console.log('   Database is now clean');
    console.log('─'.repeat(80));
    
    // Verify deletion
    const remainingCount = await getLocksCount();
    if (remainingCount === 0) {
      console.log('\n✓ Verification: All locks successfully removed\n');
    } else {
      console.log(`\n⚠️  Warning: ${remainingCount} locks still remain in database\n`);
    }

  } catch (error) {
    console.error('\n❌ Error clearing locks:', error.message);
    throw error;
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      console.log('\n📖 Clear All Locked Sites Script');
      console.log('═'.repeat(80));
      console.log('\nUsage:');
      console.log('  node clearAllLocks.js              # Interactive mode with confirmation');
      console.log('  node clearAllLocks.js --confirm    # Auto-confirm deletion');
      console.log('  node clearAllLocks.js --help       # Show this help message');
      console.log('\nDescription:');
      console.log('  Removes all locked site records from the tab_locks table.');
      console.log('  User accounts remain intact - only lock records are deleted.');
      console.log('\nExamples:');
      console.log('  node clearAllLocks.js');
      console.log('  node clearAllLocks.js --confirm\n');
      process.exit(0);
    }

    await clearAllLocks();

  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main();
