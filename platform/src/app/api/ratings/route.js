import { queryOne, run } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, err } from '@/lib/http';

// POST /api/ratings  { order_id, restaurant_score, driver_score, comment }
// Le client note restaurant + livreur après livraison.
export async function POST(req) {
  const auth = await requireRole(req, ['client']);
  if (auth.error) return err(auth.error, auth.status);
  const b = await req.json();

  const order = await queryOne('SELECT * FROM orders WHERE id = ?', [b.order_id]);
  if (!order) return err('Commande introuvable', 404);
  if (order.client_id !== auth.user.id) return err('Accès refusé', 403);
  if (order.status !== 'delivered')
    return err('Vous ne pouvez noter qu\'une commande livrée', 409);

  const existing = await queryOne('SELECT id FROM ratings WHERE order_id = ?', [b.order_id]);
  if (existing) return err('Commande déjà notée', 409);

  await run(
    `INSERT INTO ratings (order_id, restaurant_score, driver_score, comment)
     VALUES (?,?,?,?)`,
    [b.order_id, b.restaurant_score || null, b.driver_score || null, b.comment || null]
  );
  return ok({ success: true }, 201);
}
