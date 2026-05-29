import { query, run } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, err } from '@/lib/http';

// GET /api/addresses → adresses sauvegardées du client
export async function GET(req) {
  const auth = await requireRole(req, ['client']);
  if (auth.error) return err(auth.error, auth.status);
  const rows = await query(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
    [auth.user.id]
  );
  return ok({ addresses: rows });
}

// POST /api/addresses  { label, formatted, details, note, lat, lng, is_default }
export async function POST(req) {
  const auth = await requireRole(req, ['client']);
  if (auth.error) return err(auth.error, auth.status);
  const b = await req.json();
  if (!b.formatted) return err('Adresse requise');

  if (b.is_default)
    await run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [auth.user.id]);

  const res = await run(
    `INSERT INTO addresses (user_id, label, formatted, details, note, lat, lng, is_default)
     VALUES (?,?,?,?,?,?,?,?)`,
    [auth.user.id, b.label || null, b.formatted, b.details || null, b.note || null,
     b.lat || null, b.lng || null, b.is_default ? 1 : 0]
  );
  return ok({ id: Number(res.lastInsertRowid) }, 201);
}
