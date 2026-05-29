import { query, run } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, err } from '@/lib/http';

// GET /api/restaurants  → liste des restaurants actifs (public, pour les clients)
export async function GET() {
  const rows = await query(
    `SELECT id, name, description, logo_url, address, lat, lng, is_open
     FROM restaurants WHERE status = 'active' ORDER BY name`
  );
  return ok({ restaurants: rows });
}

// POST /api/restaurants  → créé par l'admin (partenaire)
export async function POST(req) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) return err(auth.error, auth.status);

  const { name, description, phone, address, lat, lng, owner_id } = await req.json();
  if (!name) return err('Nom requis');

  const res = await run(
    `INSERT INTO restaurants (owner_id, name, description, phone, address, lat, lng, status)
     VALUES (?,?,?,?,?,?,?, 'active')`,
    [owner_id || null, name, description || null, phone || null, address || null, lat || null, lng || null]
  );
  return ok({ id: Number(res.lastInsertRowid) }, 201);
}
