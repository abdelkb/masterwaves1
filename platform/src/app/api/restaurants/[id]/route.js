import { queryOne, query, run } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, err } from '@/lib/http';

// GET /api/restaurants/:id → détail + catégories + produits (menu public)
export async function GET(req, { params }) {
  const id = params.id;
  const restaurant = await queryOne('SELECT * FROM restaurants WHERE id = ?', [id]);
  if (!restaurant) return err('Restaurant introuvable', 404);

  const categories = await query(
    'SELECT * FROM categories WHERE restaurant_id = ? ORDER BY sort_order',
    [id]
  );
  const products = await query(
    `SELECT p.*, c.name AS category_name FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.restaurant_id = ? ORDER BY c.sort_order, c.name, p.name`,
    [id]
  );
  const hours = await query(
    'SELECT * FROM opening_hours WHERE restaurant_id = ? ORDER BY day_of_week',
    [id]
  );
  return ok({ restaurant, categories, products, hours });
}

// PATCH /api/restaurants/:id → le partenaire met à jour son profil
export async function PATCH(req, { params }) {
  const auth = await requireRole(req, ['restaurant', 'admin']);
  if (auth.error) return err(auth.error, auth.status);

  const restaurant = await queryOne('SELECT * FROM restaurants WHERE id = ?', [params.id]);
  if (!restaurant) return err('Restaurant introuvable', 404);
  if (auth.user.role === 'restaurant' && restaurant.owner_id !== auth.user.id)
    return err('Accès refusé', 403);

  const body = await req.json();
  const fields = ['name', 'description', 'logo_url', 'phone', 'address', 'lat', 'lng', 'is_open'];
  const updates = [];
  const args = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      args.push(body[f]);
    }
  }
  if (!updates.length) return err('Aucune donnée à mettre à jour');
  updates.push(`updated_at = datetime('now')`);
  args.push(params.id);

  await run(`UPDATE restaurants SET ${updates.join(', ')} WHERE id = ?`, args);
  return ok({ success: true });
}
