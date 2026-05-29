import { queryOne, run } from '@/lib/db';
import { requireRole, hashPassword } from '@/lib/auth';
import { ok, err } from '@/lib/http';

// POST /api/admin/reset-password  { email, new_password }
// Réservé à l'admin : réinitialise le mot de passe de n'importe quel compte.
export async function POST(req) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) return err(auth.error, auth.status);

  const { email, new_password } = await req.json();
  if (!email || !new_password) return err('Email et nouveau mot de passe requis');

  const user = await queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!user) return err('Utilisateur introuvable', 404);

  const hash = await hashPassword(new_password);
  await run(
    `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
    [hash, user.id]
  );
  return ok({ success: true });
}
