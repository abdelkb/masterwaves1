import { run, query } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { emit } from '@/lib/realtime';
import { ok, err } from '@/lib/http';

// POST /api/drivers/location  { lat, lng, heading }
// Le livreur envoie sa position → diffusée en temps réel.
export async function POST(req) {
  const auth = await requireRole(req, ['driver']);
  if (auth.error) return err(auth.error, auth.status);
  const { lat, lng, heading } = await req.json();
  if (lat == null || lng == null) return err('lat/lng requis');

  await run(
    `INSERT INTO driver_locations (driver_id, lat, lng, heading, updated_at)
     VALUES (?,?,?,?, datetime('now'))
     ON CONFLICT(driver_id) DO UPDATE SET
       lat = excluded.lat, lng = excluded.lng,
       heading = excluded.heading, updated_at = datetime('now')`,
    [auth.user.id, lat, lng, heading ?? null]
  );

  const payload = { driver_id: auth.user.id, lat, lng, heading: heading ?? null };
  // Canal gérant (carte de tous les livreurs).
  await emit('drivers-location', 'update', payload);

  // Canaux des commandes actives de ce livreur (suivi client).
  const orders = await query(
    `SELECT id FROM orders WHERE driver_id = ?
       AND status IN ('going_to_restaurant','picked_up','delivering')`,
    [auth.user.id]
  );
  for (const o of orders) await emit(`order-${o.id}`, 'driver-location', payload);

  return ok({ success: true });
}

// GET /api/drivers/location → positions de tous les livreurs (gérant)
export async function GET(req) {
  const auth = await requireRole(req, ['manager', 'admin']);
  if (auth.error) return err(auth.error, auth.status);
  const rows = await query(
    `SELECT l.driver_id, u.full_name, l.lat, l.lng, l.heading, l.updated_at
     FROM driver_locations l JOIN users u ON u.id = l.driver_id
     WHERE u.is_active = 1`
  );
  return ok({ locations: rows });
}
