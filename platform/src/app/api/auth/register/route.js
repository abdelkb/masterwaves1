import { queryOne, run } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';
import { ok, err } from '@/lib/http';

// POST /api/auth/register  { full_name, email, phone, password }
// Inscription CLIENT uniquement (les autres rôles sont créés par admin/gérant).
export async function POST(req) {
  const { full_name, email, phone, password } = await req.json();
  if (!full_name || !email || !password)
    return err('Nom, email et mot de passe requis');

  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [
    email.toLowerCase().trim(),
  ]);
  if (existing) return err('Cet email est déjà utilisé', 409);

  const hash = await hashPassword(password);
  const res = await run(
    `INSERT INTO users (role, full_name, email, phone, password_hash)
     VALUES ('client', ?, ?, ?, ?)`,
    [full_name.trim(), email.toLowerCase().trim(), phone || null, hash]
  );

  const id = Number(res.lastInsertRowid);
  const user = { id, role: 'client', full_name, email, phone };
  return ok({ token: signToken(user), user }, 201);
}
