import { createClient } from '@libsql/client';

// Client libSQL / Turso — compatible SQLite.
// En local : TURSO_DATABASE_URL=file:./db/local.db
const globalForDb = globalThis;

export const db =
  globalForDb._mwDb ||
  createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./db/local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

if (process.env.NODE_ENV !== 'production') globalForDb._mwDb = db;

// Helpers pratiques -------------------------------------------------
export async function query(sql, args = []) {
  const res = await db.execute({ sql, args });
  return res.rows;
}

export async function queryOne(sql, args = []) {
  const rows = await query(sql, args);
  return rows[0] || null;
}

export async function run(sql, args = []) {
  return db.execute({ sql, args });
}
