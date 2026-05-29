-- ============================================================
--  Master Waves — Plateforme de livraison
--  Schéma de base de données (Turso / libSQL — compatible SQLite)
-- ============================================================

-- ---------- UTILISATEURS & RÔLES ----------
-- Rôles : 'admin' (super admin), 'manager' (gérant société), 'driver' (livreur),
--         'restaurant' (partenaire), 'client'
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  role          TEXT NOT NULL CHECK (role IN ('admin','manager','driver','restaurant','client')),
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE,
  phone         TEXT,
  password_hash TEXT,                       -- NULL pour clients "téléphone" créés par le gérant
  is_active     INTEGER NOT NULL DEFAULT 1, -- 0 = désactivé (livreur suspendu par ex.)
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- RESTAURANTS (partenaires) ----------
CREATE TABLE IF NOT EXISTS restaurants (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id     INTEGER REFERENCES users(id) ON DELETE SET NULL, -- compte 'restaurant'
  name         TEXT NOT NULL,
  description  TEXT,
  logo_url     TEXT,
  phone        TEXT,
  address      TEXT,
  lat          REAL,
  lng          REAL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  is_open      INTEGER NOT NULL DEFAULT 1,   -- ouverture manuelle on/off
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- HORAIRES D'OUVERTURE ----------
-- day_of_week : 0 = Dimanche ... 6 = Samedi
CREATE TABLE IF NOT EXISTS opening_hours (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  day_of_week   INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time     TEXT,    -- 'HH:MM'
  close_time    TEXT,    -- 'HH:MM'
  is_closed     INTEGER NOT NULL DEFAULT 0
);

-- ---------- CATÉGORIES DE PRODUITS ----------
CREATE TABLE IF NOT EXISTS categories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- ---------- PRODUITS ----------
CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  price         REAL NOT NULL,            -- en DH
  image_url     TEXT,
  in_stock      INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- ADRESSES CLIENT (sauvegardées) ----------
CREATE TABLE IF NOT EXISTS addresses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       TEXT,                        -- 'Maison', 'Bureau', 'Autre'
  formatted   TEXT NOT NULL,               -- adresse texte (autocomplete Google)
  details     TEXT,                        -- étage, appartement, point de repère
  note        TEXT,                        -- "Sonner 3 fois"...
  lat         REAL,
  lng         REAL,
  is_default  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- COMMANDES ----------
-- status :
--   pending_restaurant  -> le restaurant doit valider
--   preparing           -> validée par le restaurant (ou créée par gérant) ; gérant peut dispatcher
--   driver_assigned     -> gérant a assigné un livreur + prix livraison
--   going_to_restaurant -> livreur en route vers le resto
--   picked_up           -> livreur a récupéré la commande
--   delivering          -> livreur en route vers le client
--   delivered           -> livrée
--   cancelled           -> annulée
CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id   INTEGER NOT NULL REFERENCES restaurants(id),
  client_id       INTEGER REFERENCES users(id),  -- NULL si commande téléphonique
  driver_id       INTEGER REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'pending_restaurant',
  -- infos client (copiées pour commandes téléphoniques sans compte)
  client_name     TEXT,
  client_phone    TEXT,
  -- livraison
  delivery_address   TEXT NOT NULL,
  delivery_details   TEXT,
  delivery_note      TEXT,
  delivery_lat       REAL,
  delivery_lng       REAL,
  delivery_fee       REAL,                  -- défini par le gérant (10..50)
  -- montants
  items_total     REAL NOT NULL DEFAULT 0,
  total           REAL NOT NULL DEFAULT 0,  -- items_total + delivery_fee
  payment_method  TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','cmi')),
  payment_status  TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
  is_phone_order  INTEGER NOT NULL DEFAULT 0, -- créée par le gérant
  cancel_reason   TEXT,
  cancelled_by    TEXT,                      -- 'client' | 'restaurant' | 'manager'
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- LIGNES DE COMMANDE ----------
CREATE TABLE IF NOT EXISTS order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES products(id),
  name        TEXT NOT NULL,   -- copie du nom au moment de la commande
  unit_price  REAL NOT NULL,   -- copie du prix
  quantity    INTEGER NOT NULL DEFAULT 1
);

-- ---------- HISTORIQUE DES STATUTS ----------
CREATE TABLE IF NOT EXISTS order_status_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  changed_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- POSITION GPS DES LIVREURS (temps réel) ----------
CREATE TABLE IF NOT EXISTS driver_locations (
  driver_id   INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  heading     REAL,                       -- direction (degrés)
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- ÉVALUATIONS ----------
CREATE TABLE IF NOT EXISTS ratings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_score INTEGER CHECK (restaurant_score BETWEEN 1 AND 5),
  driver_score     INTEGER CHECK (driver_score BETWEEN 1 AND 5),
  comment          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- INDEX ----------
CREATE INDEX IF NOT EXISTS idx_products_restaurant ON products(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant   ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver       ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_client       ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user      ON addresses(user_id);
