import { query, run, queryOne } from '@/lib/db';
import { requireRole, hashPassword } from '@/lib/auth';
import { ok, err } from '@/lib/http';

// POST /api/admin/partners
// Crée un compte utilisateur (role=restaurant) + un restaurant lié en une seule requête.
// Body: { full_name, email, phone, password, restaurant_name, restaurant_phone, restaurant_address }
export async function POST(req) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) return err(auth.error, auth.status);

  const b = await req.json();
  if (!b.email || !b.password || !b.restaurant_name)
    return err('Email, mot de passe et nom du restaurant requis');

  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [b.email.toLowerCase().trim()]);
  if (existing) return err('Cet email est déjà utilisé', 409);

  const hash = await hashPassword(b.password);

  // Créer le compte utilisateur restaurant
  const userRes = await run(
    `INSERT INTO users (role, full_name, email, phone, password_hash)
     VALUES ('restaurant', ?, ?, ?, ?)`,
    [b.full_name || b.restaurant_name, b.email.toLowerCase().trim(), b.phone || null, hash]
  );
  const userId = Number(userRes.lastInsertRowid);

  // Créer le restaurant lié à ce compte
  const restoRes = await run(
    `INSERT INTO restaurants (owner_id, name, phone, address, status)
     VALUES (?, ?, ?, ?, 'active')`,
    [userId, b.restaurant_name, b.restaurant_phone || null, b.restaurant_address || null]
  );

  return ok({ user_id: userId, restaurant_id: Number(restoRes.lastInsertRowid) }, 201);
}

// GET /api/admin/partners → liste des partenaires avec leur restaurant
export async function GET(req) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) return err(auth.error, auth.status);

  const rows = await query(
    `SELECT u.id, u.full_name, u.email, u.phone, u.is_active,
            r.id AS restaurant_id, r.name AS restaurant_name,
            r.address, r.status AS restaurant_status, r.is_open
     FROM users u
     LEFT JOIN restaurants r ON r.owner_id = u.id
     WHERE u.role = 'restaurant'
     ORDER BY u.created_at DESC`
  );
  return ok({ partners: rows });
}
