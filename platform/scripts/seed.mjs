import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./db/local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const hash = (p) => bcrypt.hashSync(p, 10);

async function main() {
  // --- Comptes de démonstration ---
  await db.execute({
    sql: `INSERT OR IGNORE INTO users (id, role, full_name, email, phone, password_hash)
          VALUES (?,?,?,?,?,?)`,
    args: [1, 'admin', 'Super Admin', 'admin@masterwaves.ma', '0600000000', hash('admin123')],
  });
  await db.execute({
    sql: `INSERT OR IGNORE INTO users (id, role, full_name, email, phone, password_hash)
          VALUES (?,?,?,?,?,?)`,
    args: [2, 'manager', 'Gérant Société', 'manager@masterwaves.ma', '0600000001', hash('manager123')],
  });
  await db.execute({
    sql: `INSERT OR IGNORE INTO users (id, role, full_name, email, phone, password_hash)
          VALUES (?,?,?,?,?,?)`,
    args: [3, 'driver', 'Youssef Livreur', 'driver@masterwaves.ma', '0600000002', hash('driver123')],
  });
  await db.execute({
    sql: `INSERT OR IGNORE INTO users (id, role, full_name, email, phone, password_hash)
          VALUES (?,?,?,?,?,?)`,
    args: [4, 'restaurant', 'Pizza Bella (compte)', 'resto@masterwaves.ma', '0600000003', hash('resto123')],
  });
  await db.execute({
    sql: `INSERT OR IGNORE INTO users (id, role, full_name, email, phone, password_hash)
          VALUES (?,?,?,?,?,?)`,
    args: [5, 'client', 'Client Démo', 'client@masterwaves.ma', '0600000004', hash('client123')],
  });

  // --- Restaurant ---
  await db.execute({
    sql: `INSERT OR IGNORE INTO restaurants (id, owner_id, name, description, phone, address, lat, lng, status)
          VALUES (?,?,?,?,?,?,?,?,?)`,
    args: [1, 4, 'Pizza Bella', 'Pizzas & pâtes italiennes', '0522000000',
           'Bd Mohammed V, Casablanca', 33.5731, -7.5898, 'active'],
  });

  // --- Catégories ---
  await db.execute({ sql: `INSERT OR IGNORE INTO categories (id, restaurant_id, name, sort_order) VALUES (1,1,'Pizzas',1)`, args: [] });
  await db.execute({ sql: `INSERT OR IGNORE INTO categories (id, restaurant_id, name, sort_order) VALUES (2,1,'Boissons',2)`, args: [] });

  // --- Produits ---
  const products = [
    [1, 1, 1, 'Pizza Margherita', 'Tomate, mozzarella, basilic', 55],
    [2, 1, 1, 'Pizza 4 Fromages', 'Mozzarella, gorgonzola, chèvre, parmesan', 70],
    [3, 1, 2, 'Coca-Cola 33cl', 'Canette', 10],
  ];
  for (const [id, rid, cid, name, desc, price] of products) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO products (id, restaurant_id, category_id, name, description, price)
            VALUES (?,?,?,?,?,?)`,
      args: [id, rid, cid, name, desc, price],
    });
  }

  console.log('✅ Données de démo insérées.');
  console.log('Comptes : admin@ / manager@ / driver@ / resto@ / client@masterwaves.ma');
  console.log('Mots de passe : <role>123  (ex: admin123)');
}

main();
