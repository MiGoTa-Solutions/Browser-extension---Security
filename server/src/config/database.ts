import mysql, { Pool, PoolOptions, ResultSetHeader } from 'mysql2/promise';

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
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      pin_hash VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.query<ResultSetHeader>(createUsersTable);

  const createTabLocksTable = `
    CREATE TABLE IF NOT EXISTS tab_locks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      note VARCHAR(255) NULL,
      is_group TINYINT(1) DEFAULT 0,
      tabs_json JSON NOT NULL,
      status ENUM('locked','unlocked') DEFAULT 'locked',
      locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      unlocked_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_tab_locks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.query<ResultSetHeader>(createTabLocksTable);
}
