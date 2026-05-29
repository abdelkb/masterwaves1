import { query, run } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { getOwnedRestaurant } from '@/lib/restaurant';
import { ok, err } from '@/lib/http';

// Détermine le restaurant cible selon le rôle.
async function resolveRestaurantId(user, bodyRestaurantId) {
  if (user.role === 'restaurant') {
    const r = await getOwnedRestaurant(user);
    return r ? r.id : null;
  }
  return bodyRestaurantId || null; // admin/manager
}

// GET /api/products?restaurant_id=  → liste
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const rid = searchParams.get('restaurant_id');
  if (!rid) return err('restaurant_id requis');
  const rows = await query(
    'SELECT * FROM products WHERE restaurant_id = ? ORDER BY name',
    [rid]
  );
  return ok({ products: rows });
}

// POST /api/products  → créer un produit
export async function POST(req) {
  const auth = await requireRole(req, ['restaurant', 'admin', 'manager']);
  if (auth.error) return err(auth.error, auth.status);

  const body = await req.json();
  const rid = await resolveRestaurantId(auth.user, body.restaurant_id);
  if (!rid) return err('Restaurant introuvable');
  if (!body.name || body.price == null) return err('Nom et prix requis');

  const res = await run(
    `INSERT INTO products (restaurant_id, category_id, name, description, price, image_url, in_stock)
     VALUES (?,?,?,?,?,?,?)`,
    [rid, body.category_id ? Number(body.category_id) : null, body.name, body.description || null,
     body.price, body.image_url || null, body.in_stock ?? 1]
  );
  return ok({ id: Number(res.lastInsertRowid) }, 201);
}
