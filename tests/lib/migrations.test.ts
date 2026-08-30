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
  });
});
