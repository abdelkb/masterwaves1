import { queryOne, query } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ok, err } from '@/lib/http';

// GET /api/orders/:id → détail complet (articles, historique, position livreur)
export async function GET(req, { params }) {
  const user = await getAuthUser(req);
  if (!user) return err('Non authentifié', 401);

  const order = await queryOne(
    `SELECT o.*, r.name AS restaurant_name, r.lat AS restaurant_lat, r.lng AS restaurant_lng,
            d.full_name AS driver_name, d.phone AS driver_phone
     FROM orders o
     JOIN restaurants r ON r.id = o.restaurant_id
     LEFT JOIN users d ON d.id = o.driver_id
     WHERE o.id = ?`,
    [params.id]
  );
  if (!order) return err('Commande introuvable', 404);

  // Contrôle d'accès
  if (user.role === 'client' && order.client_id !== user.id) return err('Accès refusé', 403);
  if (user.role === 'driver' && order.driver_id !== user.id) return err('Accès refusé', 403);

  const items = await query('SELECT * FROM order_items WHERE order_id = ?', [params.id]);
  const history = await query(
    'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at',
    [params.id]
  );
  let driverLocation = null;
  if (order.driver_id) {
    driverLocation = await queryOne(
      'SELECT lat, lng, heading, updated_at FROM driver_locations WHERE driver_id = ?',
      [order.driver_id]
    );
  }
  return ok({ order, items, history, driverLocation });
}
