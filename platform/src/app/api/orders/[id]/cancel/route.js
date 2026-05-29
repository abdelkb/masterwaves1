import { queryOne, run } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { emit } from '@/lib/realtime';
import { ok, err, CLIENT_LOCKED_STATUSES } from '@/lib/http';

// POST /api/orders/:id/cancel  { reason }
// Règles d'annulation :
//  - CLIENT : peut annuler uniquement tant que la commande n'est PAS
//    encore en préparation (statut 'pending_restaurant'). Au-delà, il doit
//    appeler le service → seul le gérant peut annuler.
//  - GÉRANT/ADMIN : peut annuler à N'IMPORTE QUELLE étape (sauf déjà livrée/annulée).
//  - RESTAURANT : peut annuler tant qu'il n'a pas validé (pending_restaurant).
export async function POST(req, { params }) {
  const user = await getAuthUser(req);
  if (!user) return err('Non authentifié', 401);

  const { reason } = await req.json().catch(() => ({}));
  const order = await queryOne('SELECT * FROM orders WHERE id = ?', [params.id]);
  if (!order) return err('Commande introuvable', 404);

  if (['delivered', 'cancelled'].includes(order.status))
    return err('Cette commande ne peut plus être annulée', 409);

  if (user.role === 'client') {
    if (order.client_id !== user.id) return err('Accès refusé', 403);
    if (CLIENT_LOCKED_STATUSES.includes(order.status))
      return err(
        'Commande déjà en préparation. Veuillez appeler le service pour annuler.',
        409
      );
  } else if (user.role === 'restaurant') {
    const r = await queryOne('SELECT id FROM restaurants WHERE owner_id = ?', [user.id]);
    if (!r || r.id !== order.restaurant_id) return err('Accès refusé', 403);
    if (order.status !== 'pending_restaurant')
      return err('Le restaurant ne peut annuler qu\'avant validation', 409);
  } else if (!['manager', 'admin'].includes(user.role)) {
    return err('Accès refusé', 403);
  }
  // manager/admin : pouvoir total → aucune restriction de statut.

  // Remboursement auto si déjà payé en ligne.
  const refunded = order.payment_status === 'paid';
  await run(
    `UPDATE orders
     SET status = 'cancelled', cancel_reason = ?, cancelled_by = ?,
         payment_status = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [reason || null, user.role, refunded ? 'refunded' : order.payment_status, params.id]
  );
  await run(
    'INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?,?,?)',
    [params.id, 'cancelled', user.id]
  );

  await emit(`order-${params.id}`, 'status', { status: 'cancelled' });
  await emit('orders', 'order-updated', { orderId: Number(params.id), status: 'cancelled' });
  if (order.driver_id) await emit(`driver-${order.driver_id}`, 'order-updated', { orderId: Number(params.id), status: 'cancelled' });

  return ok({ success: true, refunded });
}
