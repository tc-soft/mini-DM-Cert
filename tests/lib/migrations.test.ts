import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { migrations, runMigrations } from "@/lib/migrations";

// Matches the Lp. order in SQLite_Baza_Zamowien_Dokumentacja_v0.3.md, section 2.
const EXPECTED_PURCHASE_ORDERS_COLUMNS = [
  "id",
  "order_number",
  "product_name",
  "supplier_name",
  "quantity_kg",
  "port_price_per_kg",
  "delivered_price_per_kg",
  "order_value",
  "delivered_order_value",
  "currency_code",
  "container_number",
  "eta_port_date",
  "eta_destination_date",
  "warehouse_name",
  "shipping_line",
  "has_eur1_certificate",
  "batch_number",
  "sent_for_testing_date",
  "test_results",
  "supplier_lab_results",
  "taken_for_production",
  "payment_due_date",
  "invoice_number",
  "payment_date",
  "delivery_date",
  "is_important",
  "notes",
  "is_blocked",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
];

describe("runMigrations", () => {
  it("records every migration version in schema_migrations", () => {
    const applied = db.prepare("SELECT version FROM schema_migrations ORDER BY version").all() as {
      version: number;
    }[];
    expect(applied.map((r) => r.version)).toEqual(migrations.map((m) => m.version));
  });

  it("is idempotent — running it again does not error or duplicate rows", () => {
    expect(() => {
      runMigrations(db);
    }).not.toThrow();

    const applied = db.prepare("SELECT version FROM schema_migrations ORDER BY version").all() as {
      version: number;
    }[];
    expect(applied.map((r) => r.version)).toEqual(migrations.map((m) => m.version));
  });

  it("leaves the purchase_orders table with the columns each migration adds", () => {
    const columns = (db.prepare("PRAGMA table_info(purchase_orders)").all() as { name: string }[]).map((c) => c.name);
    expect(columns).toContain("is_important");
    expect(columns).toContain("delivered_order_value");
    expect(columns).toContain("warehouse_name");
    expect(columns).toContain("supplier_lab_results");
    expect(columns).toContain("shipping_line");
  });

  it("creates purchase_orders with the documented column order on a fresh database", () => {
    const columns = (db.prepare("PRAGMA table_info(purchase_orders)").all() as { name: string }[]).map((c) => c.name);
    expect(columns).toEqual(EXPECTED_PURCHASE_ORDERS_COLUMNS);
  });

  it("leaves foreign key enforcement on after running", () => {
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
  });
});

// The suite above only exercises runMigrations() against a database that db.ts already
// created with the latest schema (CREATE TABLE IF NOT EXISTS), so every migration.up() is a
// no-op there. That never proves the actual ALTER TABLE branch works. This rebuilds the
// pre-migration table shape by hand — as it looked on a database deployed before
// is_important/delivered_order_value/warehouse_name existed — to verify upgrading a real
// legacy database (e.g. when moving to new hosting with the existing .db file) is safe.
describe("runMigrations against a pre-migration (legacy) database", () => {
  function createLegacyDb() {
    const legacyDb = new Database(":memory:");
    legacyDb.pragma("journal_mode = WAL");
    legacyDb.exec(`
      CREATE TABLE purchase_orders (
        id INTEGER PRIMARY KEY,
        order_number TEXT CHECK (order_number IS NULL OR length(order_number) = 10),
        product_name TEXT NOT NULL CHECK (length(trim(product_name)) BETWEEN 1 AND 100),
        supplier_name TEXT NOT NULL CHECK (length(trim(supplier_name)) BETWEEN 1 AND 100),
        quantity_kg INTEGER NOT NULL CHECK (quantity_kg > 0),
        port_price_per_kg INTEGER NOT NULL CHECK (port_price_per_kg >= 0),
        delivered_price_per_kg INTEGER CHECK (delivered_price_per_kg IS NULL OR delivered_price_per_kg >= 0),
        order_value INTEGER NOT NULL CHECK (order_value >= 0),
        currency_code TEXT NOT NULL CHECK (length(currency_code) = 3 AND currency_code = upper(currency_code)),
        container_number TEXT CHECK (container_number IS NULL OR length(container_number) <= 50),
        eta_port_date TEXT,
        eta_destination_date TEXT,
        has_eur1_certificate INTEGER CHECK (has_eur1_certificate IS NULL OR has_eur1_certificate IN (0, 1)),
        batch_number TEXT CHECK (batch_number IS NULL OR length(batch_number) = 13),
        sent_for_testing_date TEXT,
        test_results TEXT CHECK (test_results IS NULL OR length(test_results) <= 50),
        is_blocked INTEGER CHECK (is_blocked IS NULL OR is_blocked IN (0, 1)),
        taken_for_production INTEGER CHECK (taken_for_production IS NULL OR taken_for_production IN (0, 1)),
        payment_due_date TEXT,
        invoice_number TEXT CHECK (invoice_number IS NULL OR length(invoice_number) <= 30),
        payment_date TEXT,
        delivery_date TEXT,
        notes TEXT CHECK (notes IS NULL OR length(notes) <= 512),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
        updated_at TEXT,
        updated_by TEXT
      );
    `);
    legacyDb
      .prepare(
        `INSERT INTO purchase_orders
          (order_number, product_name, supplier_name, quantity_kg, port_price_per_kg, order_value, currency_code, created_by)
         VALUES ('AB12345678', 'Kakao', 'Dostawca SA', 1000, 250, 250000, 'EUR', 'legacy-user')`,
      )
      .run();
    return legacyDb;
  }

  it("adds the missing columns via ALTER TABLE without touching existing rows", () => {
    const legacyDb = createLegacyDb();

    runMigrations(legacyDb);

    const columns = (legacyDb.prepare("PRAGMA table_info(purchase_orders)").all() as { name: string }[]).map(
      (c) => c.name,
    );
    expect(columns).toContain("is_important");
    expect(columns).toContain("delivered_order_value");
    expect(columns).toContain("warehouse_name");

    const row = legacyDb.prepare("SELECT * FROM purchase_orders WHERE order_number = 'AB12345678'").get() as Record<
      string,
      unknown
    >;
    expect(row.product_name).toBe("Kakao");
    expect(row.created_by).toBe("legacy-user");
    expect(row.is_important).toBeNull();
    expect(row.delivered_order_value).toBeNull();
    expect(row.warehouse_name).toBeNull();
    expect(row.supplier_lab_results).toBe(0);
    expect(row.shipping_line).toBeNull();

    const applied = legacyDb.prepare("SELECT version FROM schema_migrations ORDER BY version").all() as {
      version: number;
    }[];
    expect(applied.map((r) => r.version)).toEqual(migrations.map((m) => m.version));

    legacyDb.close();
  });

  it("is idempotent on an already-upgraded legacy database", () => {
    const legacyDb = createLegacyDb();

    runMigrations(legacyDb);
    expect(() => {
      runMigrations(legacyDb);
    }).not.toThrow();

    const count = (legacyDb.prepare("SELECT COUNT(*) AS c FROM schema_migrations").get() as { c: number }).c;
    expect(count).toBe(migrations.length);

    legacyDb.close();
  });

  it("accepts inserts using the newly added columns, CHECK constraints included", () => {
    const legacyDb = createLegacyDb();
    runMigrations(legacyDb);

    expect(() =>
      legacyDb
        .prepare(
          `INSERT INTO purchase_orders
            (product_name, supplier_name, quantity_kg, port_price_per_kg, order_value, currency_code, created_by, is_important, delivered_order_value, warehouse_name, supplier_lab_results, shipping_line)
           VALUES ('Test', 'Test', 10, 1, 10, 'EUR', 'tester', 1, 500, 'Magazyn A', 1, 'Maersk')`,
        )
        .run(),
    ).not.toThrow();

    expect(() =>
      legacyDb
        .prepare(
          `INSERT INTO purchase_orders
            (product_name, supplier_name, quantity_kg, port_price_per_kg, order_value, currency_code, created_by, supplier_lab_results)
           VALUES ('Test', 'Test', 10, 1, 10, 'EUR', 'tester', 2)`,
        )
        .run(),
    ).toThrow(/CHECK constraint failed/);

    expect(() =>
      legacyDb
        .prepare(
          `INSERT INTO purchase_orders
            (product_name, supplier_name, quantity_kg, port_price_per_kg, order_value, currency_code, created_by, shipping_line)
           VALUES ('Test', 'Test', 10, 1, 10, 'EUR', 'tester', ?)`,
        )
        .run("x".repeat(51)),
    ).toThrow(/CHECK constraint failed/);

    legacyDb.close();
  });

  // Migrations 1–3 append their columns at the end of a legacy table; migration 4 rebuilds it
  // into the documented order. The rebuild drops and recreates purchase_orders, so this also
  // guards against the DROP cascading into purchase_order_history (ON DELETE CASCADE) or
  // silently losing the indexes defined on the old table.
  it("rebuilds purchase_orders into the documented column order, keeping data, history and indexes", () => {
    const legacyDb = createLegacyDb();
    legacyDb.pragma("foreign_keys = ON");
    legacyDb.exec(`
      UPDATE purchase_orders SET is_blocked = 1, notes = 'stara uwaga';
      CREATE INDEX idx_purchase_orders_batch_number ON purchase_orders(batch_number);
      CREATE TABLE purchase_order_history (
        id INTEGER PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        edited_by TEXT NOT NULL,
        edited_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        changes TEXT NOT NULL
      );
      INSERT INTO purchase_order_history (order_id, edited_by, changes) VALUES (1, 'legacy-user', '[]');
    `);

    runMigrations(legacyDb);

    const columns = (legacyDb.prepare("PRAGMA table_info(purchase_orders)").all() as { name: string }[]).map(
      (c) => c.name,
    );
    expect(columns).toEqual(EXPECTED_PURCHASE_ORDERS_COLUMNS);

    const row = legacyDb.prepare("SELECT * FROM purchase_orders WHERE id = 1").get() as Record<string, unknown>;
    expect(row.order_number).toBe("AB12345678");
    expect(row.is_blocked).toBe(1);
    expect(row.notes).toBe("stara uwaga");

    const historyCount = (legacyDb.prepare("SELECT COUNT(*) AS c FROM purchase_order_history").get() as { c: number })
      .c;
    expect(historyCount).toBe(1);
    expect(legacyDb.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(legacyDb.pragma("foreign_key_check")).toEqual([]);

    const indexes = (
      legacyDb
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'purchase_orders'")
        .all() as {
        name: string;
      }[]
    ).map((i) => i.name);
    expect(indexes).toContain("idx_purchase_orders_batch_number");

    // FK from history must still resolve to the rebuilt table and cascade on delete.
    legacyDb.prepare("DELETE FROM purchase_orders WHERE id = 1").run();
    expect((legacyDb.prepare("SELECT COUNT(*) AS c FROM purchase_order_history").get() as { c: number }).c).toBe(0);

    legacyDb.close();
  });
});

// Database as deployed after migration 4 (v0.10 schema, no shipping_line): migration 5 must
// insert shipping_line right after warehouse_name, keeping data, history and indexes.
describe("runMigrations from the migration-4 schema (adds shipping_line)", () => {
  it("rebuilds purchase_orders with shipping_line after warehouse_name", () => {
    const v4Db = new Database(":memory:");
    v4Db.pragma("foreign_keys = ON");
    v4Db.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      INSERT INTO schema_migrations (version, name) VALUES (1, 'm1'), (2, 'm2'), (3, 'm3'), (4, 'm4');
      CREATE TABLE purchase_orders (
        id INTEGER PRIMARY KEY,
        order_number TEXT, product_name TEXT NOT NULL, supplier_name TEXT NOT NULL,
        quantity_kg INTEGER NOT NULL, port_price_per_kg INTEGER NOT NULL, delivered_price_per_kg INTEGER,
        order_value INTEGER NOT NULL, delivered_order_value INTEGER, currency_code TEXT NOT NULL,
        container_number TEXT, eta_port_date TEXT, eta_destination_date TEXT, warehouse_name TEXT,
        has_eur1_certificate INTEGER, batch_number TEXT, sent_for_testing_date TEXT, test_results TEXT,
        supplier_lab_results INTEGER, taken_for_production INTEGER, payment_due_date TEXT, invoice_number TEXT,
        payment_date TEXT, delivery_date TEXT, is_important INTEGER, notes TEXT, is_blocked INTEGER,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        created_by TEXT NOT NULL, updated_at TEXT, updated_by TEXT
      );
      CREATE INDEX idx_purchase_orders_warehouse_name ON purchase_orders(warehouse_name);
      CREATE TABLE purchase_order_history (
        id INTEGER PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        edited_by TEXT NOT NULL,
        edited_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        changes TEXT NOT NULL
      );
      INSERT INTO purchase_orders
        (product_name, supplier_name, quantity_kg, port_price_per_kg, order_value, currency_code,
         warehouse_name, supplier_lab_results, created_by)
        VALUES ('Kakao', 'Dostawca SA', 1000, 250, 250000, 'EUR', 'Magazyn A', 1, 'v4-user');
      INSERT INTO purchase_order_history (order_id, edited_by, changes) VALUES (1, 'v4-user', '[]');
    `);

    runMigrations(v4Db);

    const columns = (v4Db.prepare("PRAGMA table_info(purchase_orders)").all() as { name: string }[]).map((c) => c.name);
    expect(columns).toEqual(EXPECTED_PURCHASE_ORDERS_COLUMNS);

    const row = v4Db.prepare("SELECT * FROM purchase_orders WHERE id = 1").get() as Record<string, unknown>;
    expect(row.warehouse_name).toBe("Magazyn A");
    expect(row.supplier_lab_results).toBe(1);
    expect(row.shipping_line).toBeNull();

    expect((v4Db.prepare("SELECT COUNT(*) AS c FROM purchase_order_history").get() as { c: number }).c).toBe(1);
    expect(v4Db.pragma("foreign_key_check")).toEqual([]);
    expect(v4Db.pragma("foreign_keys", { simple: true })).toBe(1);
    const indexes = (
      v4Db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'purchase_orders'").all() as {
        name: string;
      }[]
    ).map((i) => i.name);
    expect(indexes).toContain("idx_purchase_orders_warehouse_name");

    const applied = v4Db.prepare("SELECT version FROM schema_migrations ORDER BY version").all() as {
      version: number;
    }[];
    expect(applied.map((r) => r.version)).toEqual(migrations.map((m) => m.version));

    v4Db.close();
  });
});
