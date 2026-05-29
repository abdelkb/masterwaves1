import { run, queryOne } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, err } from '@/lib/http';

// PATCH /api/drivers/:id  { is_active }  → activer/désactiver un livreur
export async function PATCH(req, { params }) {
  const auth = await requireRole(req, ['manager', 'admin']);
  if (auth.error) return err(auth.error, auth.status);
  const driver = await queryOne(
    `SELECT id FROM users WHERE id = ? AND role = 'driver'`, [params.id]
  );
  if (!driver) return err('Livreur introuvable', 404);
  const { is_active } = await req.json();
  await run(
    `UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`,
    [is_active ? 1 : 0, params.id]
  );
  return ok({ success: true });
}
