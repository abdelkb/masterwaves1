import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@libsql/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, '..', 'db', 'schema.sql'), 'utf8');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./db/local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Retire les commentaires en ligne (-- ...) puis découpe en instructions.
const cleaned = schema
  .split('\n')
  .map((line) => line.replace(/--.*$/, ''))
  .join('\n');

const statements = cleaned
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

for (const stmt of statements) {
  await db.execute(stmt);
}

console.log(`✅ Base initialisée (${statements.length} instructions).`);
