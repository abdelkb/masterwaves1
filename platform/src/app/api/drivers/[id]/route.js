import { run, queryOne } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, err } from '@/lib/http';

// PATCH /api/drivers/:id  { is_active?, full_name?, phone? }
export async function PATCH(req, { params }) {
  const auth = await requireRole(req, ['manager', 'admin']);
  if (auth.error) return err(auth.error, auth.status);
  const driver = await queryOne(
    `SELECT id FROM users WHERE id = ? AND role = 'driver'`, [params.id]
  );
  if (!driver) return err('Livreur introuvable', 404);
  const body = await req.json();
  const sets = [];
  const vals = [];
  if (body.is_active !== undefined) { sets.push('is_active = ?'); vals.push(body.is_active ? 1 : 0); }
  if (body.full_name !== undefined) { sets.push('full_name = ?'); vals.push(body.full_name); }
  if (body.phone !== undefined) { sets.push('phone = ?'); vals.push(body.phone); }
  if (!sets.length) return err('Aucun champ à modifier', 400);
  sets.push("updated_at = datetime('now')");
  vals.push(params.id);
  await run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, vals);
  return ok({ success: true });
}
