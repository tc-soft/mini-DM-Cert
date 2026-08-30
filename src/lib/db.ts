import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { DATABASE_PATH, ADMIN_USERNAME, ADMIN_PASSWORD } from "astro:env/server";
import { runMigrations } from "@/lib/migrations";

export type Role = "admin" | "user";

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  created_at: string;
}

export interface ProductRow {
  id: number;
  name: string;
}

export interface SupplierRow {
  id: number;
  name: string;
}

export interface CurrencyRow {
  id: number;
  code: string;
}

export interface PurchaseOrderRow {
  id: number;
  order_number: string | null;
  product_name: string;
  supplier_name: string;
  quantity_kg: number;
  port_price_per_kg: number;
  delivered_price_per_kg: number | null;
  order_value: number;
  delivered_order_value: number | null;
  currency_code: string;
  container_number: string | null;
  eta_port_date: string | null;
  eta_destination_date: string | null;
  has_eur1_certificate: 0 | 1 | null;
  batch_number: string | null;
  sent_for_testing_date: string | null;
  test_results: string | null;
  is_blocked: 0 | 1 | null;
  taken_for_production: 0 | 1 | null;
  payment_due_date: string | null;
  invoice_number: string | null;
  payment_date: string | null;
  delivery_date: string | null;
  is_important: 0 | 1 | null;
  notes: string | null;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface PurchaseOrderHistoryRow {
  id: number;
  order_id: number;
  edited_by: string;
  edited_at: string;
  changes: string;
}

const dbPath = resolve(DATABASE_PATH ?? "./data/mini-dm.db");
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
      CHECK (length(trim(name)) BETWEEN 1 AND 100),
    UNIQUE (name)
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
      CHECK (length(trim(name)) BETWEEN 1 AND 100),
    UNIQUE (name)
  );

  CREATE TABLE IF NOT EXISTS currencies (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL
      CHECK (
        length(code) = 3
        AND code = upper(code)
      ),
    UNIQUE (code)
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY,

    order_number TEXT
      CHECK (
        order_number IS NULL
        OR length(order_number) = 10
      ),

    product_name TEXT NOT NULL
      CHECK (length(trim(product_name)) BETWEEN 1 AND 100),

    supplier_name TEXT NOT NULL
      CHECK (length(trim(supplier_name)) BETWEEN 1 AND 100),

    quantity_kg INTEGER NOT NULL
      CHECK (quantity_kg > 0),

    port_price_per_kg INTEGER NOT NULL
      CHECK (port_price_per_kg >= 0),

    delivered_price_per_kg INTEGER
      CHECK (
        delivered_price_per_kg IS NULL
        OR delivered_price_per_kg >= 0
      ),

    order_value INTEGER NOT NULL
      CHECK (order_value >= 0),

    delivered_order_value INTEGER
      CHECK (
        delivered_order_value IS NULL
        OR delivered_order_value >= 0
      ),

    currency_code TEXT NOT NULL
      CHECK (
        length(currency_code) = 3
        AND currency_code = upper(currency_code)
      ),

    container_number TEXT
      CHECK (
        container_number IS NULL
        OR length(container_number) <= 50
      ),

    eta_port_date TEXT,
    eta_destination_date TEXT,

    has_eur1_certificate INTEGER
      CHECK (
        has_eur1_certificate IS NULL
        OR has_eur1_certificate IN (0, 1)
      ),

    batch_number TEXT
      CHECK (
        batch_number IS NULL
        OR length(batch_number) = 13
      ),

    sent_for_testing_date TEXT,

    test_results TEXT
      CHECK (
        test_results IS NULL
        OR length(test_results) <= 50
      ),

    is_blocked INTEGER
      CHECK (
        is_blocked IS NULL
        OR is_blocked IN (0, 1)
      ),

    taken_for_production INTEGER
      CHECK (
        taken_for_production IS NULL
        OR taken_for_production IN (0, 1)
      ),

    payment_due_date TEXT,

    invoice_number TEXT
      CHECK (
        invoice_number IS NULL
        OR length(invoice_number) <= 30
      ),

    payment_date TEXT,
    delivery_date TEXT,

    is_important INTEGER
      CHECK (
        is_important IS NULL
        OR is_important IN (0, 1)
      ),

    notes TEXT
      CHECK (
        notes IS NULL
        OR length(notes) <= 512
      ),

    created_at TEXT NOT NULL
      DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    created_by TEXT NOT NULL
      CHECK (length(trim(created_by)) > 0),

    updated_at TEXT,
    updated_by TEXT
  );
`);

// CREATE TABLE IF NOT EXISTS above is a no-op on a database that already has purchase_orders
// from before a column existed, so column/constraint changes to existing tables are applied
// via versioned migrations instead (src/lib/migrations.ts) — new tables/indexes don't need one.
runMigrations(db);

db.exec(`
  CREATE TABLE IF NOT EXISTS purchase_order_history (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    edited_by TEXT NOT NULL,
    edited_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    changes TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_purchase_order_history_order_id ON purchase_order_history(order_id);
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_purchase_orders_is_important ON purchase_orders(is_important);
  CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number ON purchase_orders(order_number);
  CREATE INDEX IF NOT EXISTS idx_purchase_orders_product_name ON purchase_orders(product_name);
  CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_name ON purchase_orders(supplier_name);
  CREATE INDEX IF NOT EXISTS idx_purchase_orders_currency_code ON purchase_orders(currency_code);
  CREATE INDEX IF NOT EXISTS idx_purchase_orders_batch_number ON purchase_orders(batch_number);
  CREATE INDEX IF NOT EXISTS idx_purchase_orders_container_number ON purchase_orders(container_number);
`);

// scrypt with a random 16-byte salt, stored alongside the hash as "salt:hash" (both hex).
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function seedDefaultAdmin() {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  if (count > 0) return;

  const username = ADMIN_USERNAME ?? "admin";
  const password = ADMIN_PASSWORD ?? randomBytes(9).toString("base64url");

  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')").run(
    username,
    hashPassword(password),
  );

  if (!ADMIN_PASSWORD) {
    // eslint-disable-next-line no-console
    console.log(
      `\n[mini-dm] Seeded default admin account — username: "${username}", password: "${password}"\n` +
        "[mini-dm] This password is only shown once. Change it after first sign-in; set ADMIN_PASSWORD to pin it instead.\n",
    );
  }
}

seedDefaultAdmin();

function seedDefaultCurrencies() {
  const insert = db.prepare("INSERT OR IGNORE INTO currencies (code) VALUES (?)");
  for (const code of ["EUR", "USD", "PLN"]) {
    insert.run(code);
  }
}

seedDefaultCurrencies();
