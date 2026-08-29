import type Database from "better-sqlite3";

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return columns.some((c) => c.name === column);
}

// Each entry patches an EXISTING table's shape (SQLite has no "ADD COLUMN IF NOT EXISTS",
// so every `up` must guard itself). Brand-new tables/indexes don't need an entry here —
// `CREATE TABLE/INDEX IF NOT EXISTS` in db.ts already handles those idempotently for both
// fresh and pre-existing databases. Add a new entry (next version number) whenever a column
// or constraint changes on a table that may already exist on a deployed database.
export const migrations: Migration[] = [
  {
    version: 1,
    name: "add purchase_orders.is_important",
    up: (db) => {
      if (!hasColumn(db, "purchase_orders", "is_important")) {
        db.exec(
          "ALTER TABLE purchase_orders ADD COLUMN is_important INTEGER CHECK (is_important IS NULL OR is_important IN (0, 1))",
        );
      }
    },
  },
  {
    version: 2,
    name: "add purchase_orders.delivered_order_value",
    up: (db) => {
      if (!hasColumn(db, "purchase_orders", "delivered_order_value")) {
        db.exec(
          "ALTER TABLE purchase_orders ADD COLUMN delivered_order_value INTEGER CHECK (delivered_order_value IS NULL OR delivered_order_value >= 0)",
        );
      }
    },
  },
];

// Runs once at startup (see db.ts). On a fresh database the base schema already has the
// latest shape, so each `up` is a no-op — but the version still gets recorded, so a fresh
// and an upgraded-in-place database end up with an identical schema_migrations history.
export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  const applied = new Set(
    (db.prepare("SELECT version FROM schema_migrations").all() as { version: number }[]).map((row) => row.version),
  );

  const pending = migrations.filter((m) => !applied.has(m.version)).sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    const apply = db.transaction(() => {
      migration.up(db);
      db.prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?)").run(migration.version, migration.name);
    });
    apply();
  }
}
