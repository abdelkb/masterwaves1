import { run } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { getOwnedRestaurant } from '@/lib/restaurant';
import { ok, err } from '@/lib/http';

// Parse CSV simple (gère les guillemets). Colonnes attendues :
//   name, description, price, category   (en-tête sur la 1ère ligne)
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const split = (line) => {
    const out = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = split(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i]; });
    return row;
  });
}

// POST /api/products/import  { restaurant_id?, csv: "<contenu csv>" }
// Ajoute des produits en batch. Crée les catégories manquantes.
export async function POST(req) {
  const auth = await requireRole(req, ['restaurant', 'admin', 'manager']);
  if (auth.error) return err(auth.error, auth.status);

  const { restaurant_id, csv } = await req.json();
  let rid = restaurant_id;
  if (auth.user.role === 'restaurant') {
    const r = await getOwnedRestaurant(auth.user);
    rid = r ? r.id : null;
  }
  if (!rid) return err('Restaurant introuvable');
  if (!csv) return err('Contenu CSV requis');

  const rows = parseCsv(csv);
  if (!rows.length) return err('CSV vide ou invalide');

  // Cache des catégories par nom.
  const catCache = {};
  async function getCategoryId(name) {
    if (!name) return null;
    const key = name.toLowerCase();
    if (catCache[key]) return catCache[key];
    const res = await run(
      'INSERT INTO categories (restaurant_id, name) VALUES (?, ?)',
      [rid, name]
    );
    catCache[key] = Number(res.lastInsertRowid);
    return catCache[key];
  }

  let imported = 0;
  const errors = [];
  for (const [i, row] of rows.entries()) {
    const name = row.name;
    const price = parseFloat(row.price);
    if (!name || isNaN(price)) {
      errors.push(`Ligne ${i + 2}: nom ou prix invalide`);
      continue;
    }
    const categoryId = await getCategoryId(row.category);
    await run(
      `INSERT INTO products (restaurant_id, category_id, name, description, price)
       VALUES (?,?,?,?,?)`,
      [rid, categoryId, name, row.description || null, price]
    );
    imported++;
  }
  return ok({ imported, errors });
}
