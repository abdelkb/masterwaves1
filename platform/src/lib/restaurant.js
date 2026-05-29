import { queryOne } from './db.js';

// Renvoie le restaurant lié à l'utilisateur courant (rôle 'restaurant'),
// ou null. L'admin doit passer un restaurant_id explicite.
export async function getOwnedRestaurant(user) {
  if (user.role === 'restaurant')
    return queryOne('SELECT * FROM restaurants WHERE owner_id = ?', [user.id]);
  return null;
}
