import { queryOne, run } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { emit } from '@/lib/realtime';
import { ok, err, DELIVERY_FEE_OPTIONS } from '@/lib/http';

// POST /api/orders/:id/assign  { driver_id, delivery_fee }
// Réservé au GÉRANT : fixe le prix de livraison et assigne un livreur.
// Pré-requis : la commande doit être 'preparing' (validée par le restaurant).
export async function POST(req, { params }) {
  const auth = await requireRole(req, ['manager', 'admin']);
  if (auth.error) return err(auth.error, auth.status);

  const { driver_id, delivery_fee } = await req.json();
  if (!driver_id) return err('Livreur requis');
  if (!DELIVERY_FEE_OPTIONS.includes(Number(delivery_fee)))
    return err(`Prix de livraison invalide (choix: ${DELIVERY_FEE_OPTIONS.join(', ')} DH)`);

  const order = await queryOne('SELECT * FROM orders WHERE id = ?', [params.id]);
  if (!order) return err('Commande introuvable', 404);
  if (order.status !== 'preparing')
    return err('La commande doit être validée par le restaurant avant dispatch', 409);

  const driver = await queryOne(
    `SELECT * FROM users WHERE id = ? AND role = 'driver' AND is_active = 1`,
    [driver_id]
  );
  if (!driver) return err('Livreur introuvable ou inactif', 404);

  const newTotal = order.items_total + Number(delivery_fee);
  await run(
    `UPDATE orders
     SET driver_id = ?, delivery_fee = ?, total = ?, status = 'driver_assigned',
         updated_at = datetime('now')
     WHERE id = ?`,
    [driver_id, Number(delivery_fee), newTotal, params.id]
  );
  await run(
    'INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?,?,?)',
    [params.id, 'driver_assigned', auth.user.id]
  );

  // Notifie le livreur + le client.
  await emit(`driver-${driver_id}`, 'new-assignment', { orderId: Number(params.id) });
  await emit(`order-${params.id}`, 'status', { status: 'driver_assigned' });
  await emit('orders', 'order-updated', { orderId: Number(params.id), status: 'driver_assigned' });

  return ok({ success: true, delivery_fee: Number(delivery_fee), total: newTotal });
}
