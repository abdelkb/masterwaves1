import { queryOne } from '@/lib/db';
import { verifyPassword, signToken } from '@/lib/auth';
import { ok, err } from '@/lib/http';

// POST /api/auth/login  { email, password }
export async function POST(req) {
  const { email, password } = await req.json();
  if (!email || !password) return err('Email et mot de passe requis');

  const user = await queryOne(
    'SELECT * FROM users WHERE email = ?',
    [email.toLowerCase().trim()]
  );
  if (!user || !user.password_hash) return err('Identifiants invalides', 401);
  if (!user.is_active) return err('Compte désactivé', 403);

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return err('Identifiants invalides', 401);

  const token = signToken(user);
  return ok({
    token,
    user: { id: user.id, role: user.role, full_name: user.full_name, email: user.email, phone: user.phone },
  });
}
