import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { migrations, runMigrations } from "@/lib/migrations";

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

    const applied = legacyDb.prepare("SELECT version FROM schema_migrations ORDER BY version").all() as {
      version: number;
    }[];
    expect(applied.map((r) => r.version)).toEqual(migrations.map((m) => m.version));

    legacyDb.close();
  });

  it("is idempotent on an already-upgraded legacy database", () => {
    const legacyDb = createLegacyDb();

    runMigrations(legacyDb);
    expect(() => runMigrations(legacyDb)).not.toThrow();

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
            (product_name, supplier_name, quantity_kg, port_price_per_kg, order_value, currency_code, created_by, is_important, delivered_order_value, warehouse_name)
           VALUES ('Test', 'Test', 10, 1, 10, 'EUR', 'tester', 1, 500, 'Magazyn A')`,
        )
        .run(),
    ).not.toThrow();

    legacyDb.close();
  });
});
