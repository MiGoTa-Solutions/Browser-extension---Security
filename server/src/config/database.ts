import mysql, { Pool, PoolOptions, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const parsedUrl = new URL(databaseUrl);

const poolOptions: PoolOptions = {
  host: parsedUrl.hostname,
  port: parseInt(parsedUrl.port || '3306', 10),
  user: decodeURIComponent(parsedUrl.username),
  password: decodeURIComponent(parsedUrl.password),
  database: parsedUrl.pathname.replace('/', '') || 'defaultdb',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  ssl: parsedUrl.searchParams.get('ssl-mode')
    ? { rejectUnauthorized: false }
    : undefined,
};

export const pool: Pool = mysql.createPool(poolOptions);

export async function ensureSchema() {
  await ensureUsersTable();
  await ensureUserSettingsTable();
  await ensureTabLocksTable();
}

async function ensureUsersTable() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NULL,
      pin_hash VARCHAR(255) NULL,
      google_id VARCHAR(255) UNIQUE NULL,
      google_avatar VARCHAR(512) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.query<ResultSetHeader>(createUsersTable);

  const [columns] = await pool.query<RowDataPacket[]>('SHOW COLUMNS FROM users');
  const columnNames = new Set(columns.map((column) => column.Field as string));

  const passwordColumn = columns.find((column) => column.Field === 'password_hash');
  if (passwordColumn && passwordColumn.Null === 'NO') {
    await pool.query('ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL');
  }

  if (!columnNames.has('google_id')) {
    await pool.query('ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE NULL AFTER pin_hash');
  }

  if (!columnNames.has('google_avatar')) {
    await pool.query('ALTER TABLE users ADD COLUMN google_avatar VARCHAR(512) NULL AFTER google_id');
  }
}

async function ensureUserSettingsTable() {
  const createSettingsTable = `
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INT PRIMARY KEY,
      display_name VARCHAR(100) NULL,
      avatar_url MEDIUMTEXT NULL,
      timezone VARCHAR(64) DEFAULT 'UTC',
      notifications_email TINYINT(1) DEFAULT 1,
      notifications_browser TINYINT(1) DEFAULT 1,
      auto_lock_new_tabs TINYINT(1) DEFAULT 1,
      auto_sync_interval INT DEFAULT 5,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.query<ResultSetHeader>(createSettingsTable);

  const [columns] = await pool.query<RowDataPacket[]>('SHOW COLUMNS FROM user_settings');
  const columnNames = new Set(columns.map((column) => column.Field as string));

  const addColumn = async (name: string, definition: string, after?: string) => {
    if (columnNames.has(name)) {
      return;
    }

    const clause = after ? ` AFTER ${after}` : '';
    await pool.query(`ALTER TABLE user_settings ADD COLUMN ${name} ${definition}${clause}`);
    columnNames.add(name);
  };

  await addColumn('display_name', 'VARCHAR(100) NULL', 'user_id');
  await addColumn('avatar_url', 'MEDIUMTEXT NULL', 'display_name');
  await addColumn('timezone', "VARCHAR(64) DEFAULT 'UTC'", 'avatar_url');
  await addColumn('notifications_email', 'TINYINT(1) DEFAULT 1', 'timezone');
  await addColumn('notifications_browser', 'TINYINT(1) DEFAULT 1', 'notifications_email');
  await addColumn('auto_lock_new_tabs', 'TINYINT(1) DEFAULT 1', 'notifications_browser');
  await addColumn('auto_sync_interval', 'INT DEFAULT 5', 'auto_lock_new_tabs');
  await addColumn('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'auto_sync_interval');
}

async function ensureTabLocksTable() {
  const createTabLocksTable = `
    CREATE TABLE IF NOT EXISTS tab_locks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      url VARCHAR(255) NULL,
      lock_name VARCHAR(100) NULL,
      is_locked BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.query<ResultSetHeader>(createTabLocksTable);

  const [columns] = await pool.query<RowDataPacket[]>('SHOW COLUMNS FROM tab_locks');
  const columnNames = new Set(columns.map((column) => column.Field as string));
  const columnMap = new Map(columns.map((column) => [column.Field as string, column]));

  const allowNullColumn = async (columnName: string) => {
    const column = columnMap.get(columnName);
    if (!column || column.Null !== 'NO') return;
    const defaultClause = column.Default === null
      ? ''
      : column.Default === 'CURRENT_TIMESTAMP'
        ? 'DEFAULT CURRENT_TIMESTAMP'
        : `DEFAULT ${mysql.escape(column.Default)}`;
    await pool.query(`ALTER TABLE tab_locks MODIFY COLUMN ${columnName} ${column.Type} NULL ${defaultClause}`);
  };

  if (!columnNames.has('url')) {
    await pool.query('ALTER TABLE tab_locks ADD COLUMN url VARCHAR(255) NULL AFTER user_id');
    columnNames.add('url');
  }

  if (!columnNames.has('lock_name')) {
    await pool.query('ALTER TABLE tab_locks ADD COLUMN lock_name VARCHAR(100) NULL AFTER url');
    columnNames.add('lock_name');
  }

  if (!columnNames.has('is_locked')) {
    await pool.query('ALTER TABLE tab_locks ADD COLUMN is_locked BOOLEAN DEFAULT TRUE AFTER lock_name');
    columnNames.add('is_locked');

    if (columnNames.has('status')) {
      await pool.query("UPDATE tab_locks SET is_locked = CASE WHEN status = 'locked' THEN TRUE ELSE FALSE END WHERE status IS NOT NULL");
    }
  }

  if (!columnNames.has('created_at')) {
    await pool.query('ALTER TABLE tab_locks ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER is_locked');
    columnNames.add('created_at');

    if (columnNames.has('locked_at')) {
      await pool.query('UPDATE tab_locks SET created_at = locked_at WHERE locked_at IS NOT NULL');
    }
  }

  if (columnNames.has('name')) {
    await allowNullColumn('name');
    await pool.query("UPDATE tab_locks SET lock_name = name WHERE (lock_name IS NULL OR lock_name = '') AND name IS NOT NULL");
  }

  if (columnNames.has('tabs_json')) {
    await allowNullColumn('tabs_json');
  }

  if (columnNames.has('status')) {
    await allowNullColumn('status');
  }

  if (columnNames.has('pin')) {
    await allowNullColumn('pin');
  }

  if (columnNames.has('locked_at')) {
    await allowNullColumn('locked_at');
  }

  if (columnNames.has('unlocked_at')) {
    await allowNullColumn('unlocked_at');
  }
}
