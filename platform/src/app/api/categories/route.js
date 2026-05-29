import { query, run } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { getOwnedRestaurant } from '@/lib/restaurant';
import { ok, err } from '@/lib/http';

// GET /api/categories?restaurant_id=
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const rid = searchParams.get('restaurant_id');
  if (!rid) return err('restaurant_id requis');
  const rows = await query(
    'SELECT * FROM categories WHERE restaurant_id = ? ORDER BY sort_order',
    [rid]
  );
  return ok({ categories: rows });
}

// DELETE /api/categories?id=
export async function DELETE(req) {
  const auth = await requireRole(req, ['restaurant', 'admin', 'manager']);
  if (auth.error) return err(auth.error, auth.status);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return err('id requis');
  await run('DELETE FROM categories WHERE id = ?', [id]);
  return ok({ success: true });
}

// POST /api/categories  { name, sort_order, restaurant_id? }
export async function POST(req) {
  const auth = await requireRole(req, ['restaurant', 'admin', 'manager']);
  if (auth.error) return err(auth.error, auth.status);
  const body = await req.json();
  let rid = body.restaurant_id;
  if (auth.user.role === 'restaurant') {
    const r = await getOwnedRestaurant(auth.user);
    rid = r ? r.id : null;
  }
  if (!rid || !body.name) return err('Restaurant et nom requis');
  const res = await run(
    'INSERT INTO categories (restaurant_id, name, sort_order) VALUES (?,?,?)',
    [rid, body.name, body.sort_order || 0]
  );
  return ok({ id: Number(res.lastInsertRowid) }, 201);
}
