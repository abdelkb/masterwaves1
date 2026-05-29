import { queryOne, run } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { emit } from '@/lib/realtime';
import { ok, err, ORDER_FLOW } from '@/lib/http';

// Qui a le droit de passer à tel statut.
const ALLOWED_BY_ROLE = {
  restaurant: ['preparing'],                          // valide & lance la préparation
  manager: ['preparing', 'driver_assigned', 'cancelled'],
  admin: ['preparing', 'driver_assigned', 'cancelled'],
  driver: ['going_to_restaurant', 'picked_up', 'delivering', 'delivered'],
};

// POST /api/orders/:id/status  { status }
export async function POST(req, { params }) {
  const user = await getAuthUser(req);
  if (!user) return err('Non authentifié', 401);

  const { status } = await req.json();
  const order = await queryOne('SELECT * FROM orders WHERE id = ?', [params.id]);
  if (!order) return err('Commande introuvable', 404);

  // Transition valide dans le flux ?
  const allowedNext = ORDER_FLOW[order.status] || [];
  if (!allowedNext.includes(status))
    return err(`Transition ${order.status} → ${status} non autorisée`, 409);

  // Rôle autorisé pour ce statut ?
  const roleAllowed = ALLOWED_BY_ROLE[user.role] || [];
  if (!roleAllowed.includes(status)) return err('Accès refusé pour ce statut', 403);

  // Le restaurant ne peut agir que sur ses propres commandes.
  if (user.role === 'restaurant') {
    const r = await queryOne('SELECT id FROM restaurants WHERE owner_id = ?', [user.id]);
    if (!r || r.id !== order.restaurant_id) return err('Accès refusé', 403);
  }
  // Le livreur ne peut agir que sur ses commandes assignées.
  if (user.role === 'driver' && order.driver_id !== user.id)
    return err('Accès refusé', 403);

  await run(
    `UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    [status, params.id]
  );
  await run(
    'INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?,?,?)',
    [params.id, status, user.id]
  );

  // Notifications temps réel.
  await emit(`order-${params.id}`, 'status', { status });
  await emit('orders', 'order-updated', { orderId: Number(params.id), status });
  if (order.driver_id) await emit(`driver-${order.driver_id}`, 'order-updated', { orderId: Number(params.id), status });

  return ok({ success: true, status });
}
