import { db, query, queryOne, run } from '@/lib/db';
import { requireRole, getAuthUser } from '@/lib/auth';
import { emit } from '@/lib/realtime';
import { ok, err } from '@/lib/http';

// GET /api/orders  → liste filtrée selon le rôle
//   client     : ses commandes
//   restaurant : commandes de son restaurant
//   manager/admin : toutes (filtre ?status= optionnel)
//   driver     : commandes qui lui sont assignées
export async function GET(req) {
  const user = await getAuthUser(req);
  if (!user) return err('Non authentifié', 401);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let sql = `SELECT o.*, r.name AS restaurant_name, d.full_name AS driver_name
             FROM orders o
             JOIN restaurants r ON r.id = o.restaurant_id
             LEFT JOIN users d ON d.id = o.driver_id
             WHERE 1=1`;
  const args = [];

  if (user.role === 'client') { sql += ' AND o.client_id = ?'; args.push(user.id); }
  else if (user.role === 'driver') { sql += ' AND o.driver_id = ?'; args.push(user.id); }
  else if (user.role === 'restaurant') {
    const r = await queryOne('SELECT id FROM restaurants WHERE owner_id = ?', [user.id]);
    sql += ' AND o.restaurant_id = ?'; args.push(r ? r.id : -1);
  }
  // manager/admin : aucune restriction

  if (status) { sql += ' AND o.status = ?'; args.push(status); }
  sql += ' ORDER BY o.created_at DESC LIMIT 200';

  const orders = await query(sql, args);
  return ok({ orders });
}

// POST /api/orders → créer une commande
//  - par un CLIENT : statut 'pending_restaurant' (le resto doit valider)
//  - par le GÉRANT (commande téléphonique) : statut 'preparing' direct
// Body: { restaurant_id, items:[{product_id, quantity}], delivery_address,
//         delivery_details, delivery_note, delivery_lat, delivery_lng,
//         payment_method, client_name, client_phone, delivery_fee? }
export async function POST(req) {
  const user = await getAuthUser(req);
  if (!user) return err('Non authentifié', 401);
  if (!['client', 'manager', 'admin'].includes(user.role))
    return err('Accès refusé', 403);

  const b = await req.json();
  if (!b.restaurant_id || !Array.isArray(b.items) || !b.items.length)
    return err('Restaurant et articles requis');
  if (!b.delivery_address) return err('Adresse de livraison requise');

  const restaurant = await queryOne('SELECT * FROM restaurants WHERE id = ?', [b.restaurant_id]);
  if (!restaurant) return err('Restaurant introuvable', 404);

  // Calcule le total à partir des prix réels en base (anti-triche).
  let itemsTotal = 0;
  const resolved = [];
  for (const it of b.items) {
    const p = await queryOne('SELECT * FROM products WHERE id = ? AND restaurant_id = ?',
      [it.product_id, b.restaurant_id]);
    if (!p) return err(`Produit ${it.product_id} introuvable`);
    if (!p.in_stock) return err(`"${p.name}" est en rupture de stock`);
    const qty = Math.max(1, parseInt(it.quantity) || 1);
    itemsTotal += p.price * qty;
    resolved.push({ product_id: p.id, name: p.name, unit_price: p.price, quantity: qty });
  }

  const isPhoneOrder = user.role !== 'client';
  const status = isPhoneOrder ? 'preparing' : 'pending_restaurant';
  const deliveryFee = isPhoneOrder ? (b.delivery_fee || null) : null;
  const total = itemsTotal + (deliveryFee || 0);

  const res = await run(
    `INSERT INTO orders
       (restaurant_id, client_id, status, client_name, client_phone,
        delivery_address, delivery_details, delivery_note, delivery_lat, delivery_lng,
        delivery_fee, items_total, total, payment_method, is_phone_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      b.restaurant_id,
      user.role === 'client' ? user.id : null,
      status,
      isPhoneOrder ? (b.client_name || null) : user.full_name,
      isPhoneOrder ? (b.client_phone || null) : user.phone,
      b.delivery_address, b.delivery_details || null, b.delivery_note || null,
      b.delivery_lat || null, b.delivery_lng || null,
      deliveryFee, itemsTotal, total,
      b.payment_method || 'cash', isPhoneOrder ? 1 : 0,
    ]
  );
  const orderId = Number(res.lastInsertRowid);

  for (const it of resolved) {
    await run(
      `INSERT INTO order_items (order_id, product_id, name, unit_price, quantity)
       VALUES (?,?,?,?,?)`,
      [orderId, it.product_id, it.name, it.unit_price, it.quantity]
    );
  }
  await run(
    'INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?,?,?)',
    [orderId, status, user.id]
  );

  // Notifie le restaurant + le gérant (canal global).
  await emit('orders', 'new-order', { orderId, restaurant_id: b.restaurant_id, status });
  await emit(`restaurant-${b.restaurant_id}`, 'new-order', { orderId });

  return ok({ id: orderId, status, total }, 201);
}
