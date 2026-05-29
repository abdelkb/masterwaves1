import { query, queryOne, run } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { ok, err } from '@/lib/http';

// GET /api/drivers → liste des livreurs (gérant) avec leur dernière position
export async function GET(req) {
  const auth = await requireRole(req, ['manager', 'admin']);
  if (auth.error) return err(auth.error, auth.status);
  const rows = await query(
    `SELECT u.id, u.full_name, u.phone, u.email, u.is_active,
            l.lat, l.lng, l.updated_at AS location_updated_at,
            (SELECT COUNT(*) FROM orders o
              WHERE o.driver_id = u.id
                AND o.status IN ('driver_assigned','going_to_restaurant','picked_up','delivering')
            ) AS active_orders
     FROM users u
     LEFT JOIN driver_locations l ON l.driver_id = u.id
     WHERE u.role = 'driver'
     ORDER BY u.full_name`
  );
  return ok({ drivers: rows });
}

// POST /api/drivers → le gérant crée un compte livreur
//   { full_name, email, phone, password }
export async function POST(req) {
  const auth = await requireRole(req, ['manager', 'admin']);
  if (auth.error) return err(auth.error, auth.status);
  const { full_name, email, phone, password } = await req.json();
  if (!full_name || !email || !password)
    return err('Nom, email et mot de passe requis');

  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [
    email.toLowerCase().trim(),
  ]);
  if (existing) return err('Email déjà utilisé', 409);

  const hash = await hashPassword(password);
  const res = await run(
    `INSERT INTO users (role, full_name, email, phone, password_hash)
     VALUES ('driver', ?, ?, ?, ?)`,
    [full_name, email.toLowerCase().trim(), phone || null, hash]
  );
  return ok({ id: Number(res.lastInsertRowid) }, 201);
}
