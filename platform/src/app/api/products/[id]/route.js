import { queryOne, run } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { getOwnedRestaurant } from '@/lib/restaurant';
import { ok, err } from '@/lib/http';

async function loadOwned(req, id) {
  const auth = await requireRole(req, ['restaurant', 'admin', 'manager']);
  if (auth.error) return { error: auth.error, status: auth.status };
  const product = await queryOne('SELECT * FROM products WHERE id = ?', [id]);
  if (!product) return { error: 'Produit introuvable', status: 404 };
  if (auth.user.role === 'restaurant') {
    const r = await getOwnedRestaurant(auth.user);
    if (!r || r.id !== product.restaurant_id)
      return { error: 'Accès refusé', status: 403 };
  }
  return { product };
}

// PATCH /api/products/:id
export async function PATCH(req, { params }) {
  const res = await loadOwned(req, params.id);
  if (res.error) return err(res.error, res.status);

  const body = await req.json();
  const fields = ['name', 'description', 'price', 'image_url', 'in_stock', 'category_id'];
  const updates = [];
  const args = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      args.push(f === 'category_id' && body[f] ? Number(body[f]) : body[f]);
    }
  }
  if (!updates.length) return err('Aucune donnée');
  updates.push(`updated_at = datetime('now')`);
  args.push(params.id);
  await run(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, args);
  return ok({ success: true });
}

// DELETE /api/products/:id
export async function DELETE(req, { params }) {
  const res = await loadOwned(req, params.id);
  if (res.error) return err(res.error, res.status);
  await run('DELETE FROM products WHERE id = ?', [params.id]);
  return ok({ success: true });
}
