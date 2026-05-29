import { queryOne } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ok, err } from '@/lib/http';

// GET /api/me → utilisateur courant (+ restaurant si rôle 'restaurant')
export async function GET(req) {
  const user = await getAuthUser(req);
  if (!user) return err('Non authentifié', 401);
  let restaurant = null;
  if (user.role === 'restaurant')
    restaurant = await queryOne('SELECT * FROM restaurants WHERE owner_id = ?', [user.id]);
  return ok({ user, restaurant });
}
