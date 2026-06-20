-- Warehouse Management System schema.
-- Safe to run repeatedly: every object uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'worker')),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Storage locations: receiving bays, racks, bins, shipping docks.
CREATE TABLE IF NOT EXISTS locations (
  id        SERIAL PRIMARY KEY,
  code      TEXT UNIQUE NOT NULL,
  name      TEXT NOT NULL,
  type      TEXT NOT NULL DEFAULT 'bin' CHECK (type IN ('receiving', 'bin', 'rack', 'shipping')),
  active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  sku           TEXT UNIQUE NOT NULL,
  barcode       TEXT UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  category      TEXT,
  unit          TEXT NOT NULL DEFAULT 'EA',
  reorder_point INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode);

-- Current quantity of a product at a location. One row per pair.
CREATE TABLE IF NOT EXISTS inventory (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  UNIQUE (product_id, location_id)
);

-- Inbound goods.
CREATE TABLE IF NOT EXISTS receipts (
  id         SERIAL PRIMARY KEY,
  reference  TEXT UNIQUE NOT NULL,
  supplier   TEXT,
  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  notes      TEXT,
  created_by INTEGER REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS receipt_lines (
  id          SERIAL PRIMARY KEY,
  receipt_id  INTEGER NOT NULL REFERENCES receipts (id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products (id),
  location_id INTEGER NOT NULL REFERENCES locations (id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0)
);

-- Outbound orders.
CREATE TABLE IF NOT EXISTS shipments (
  id         SERIAL PRIMARY KEY,
  reference  TEXT UNIQUE NOT NULL,
  customer   TEXT,
  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'shipped', 'cancelled')),
  notes      TEXT,
  created_by INTEGER REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  shipped_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS shipment_lines (
  id          SERIAL PRIMARY KEY,
  shipment_id INTEGER NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products (id),
  location_id INTEGER NOT NULL REFERENCES locations (id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0)
);

-- Append-only audit trail of every stock change.
CREATE TABLE IF NOT EXISTS stock_movements (
  id             SERIAL PRIMARY KEY,
  product_id     INTEGER NOT NULL REFERENCES products (id),
  location_id    INTEGER NOT NULL REFERENCES locations (id),
  quantity_delta INTEGER NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('receipt', 'shipment', 'adjustment', 'transfer')),
  reference      TEXT,
  user_id        INTEGER REFERENCES users (id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON stock_movements (created_at DESC);
