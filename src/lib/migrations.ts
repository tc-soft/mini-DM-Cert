import type Database from "better-sqlite3";

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

function columnNames(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
}

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  return columnNames(db, table).includes(column);
}

// True when `current` contains every column of `snapshot`, in the snapshot's order. Columns
// unknown to the snapshot (added by LATER migrations) are ignored, so a historical rebuild stays
// a no-op on a database that is already past it — e.g. a fresh one created from the latest
// db.ts schema — instead of rebuilding it back into an older shape and dropping newer columns.
function hasColumnsInOrder(current: string[], snapshot: string[]): boolean {
  return current.filter((c) => snapshot.includes(c)).join(",") === snapshot.join(",");
}

// SQLite can only append columns, so placing a new column mid-table (or reordering) means
// rebuilding purchase_orders: create new → copy → drop old → rename → recreate indexes.
// Requires foreign_keys OFF (handled by runMigrations), or the DROP would cascade-delete
// purchase_order_history. `afterCopy` gets the pre-rebuild column list, to backfill new columns.
// `isUpToDate` overrides the default no-op check (column order) — needed when a rebuild only
// changes a constraint, which the column list can't reveal.
function rebuildPurchaseOrders(
  db: Database.Database,
  snapshot: { columns: string[]; createSql: string; tempTable: string },
  afterCopy?: (previousColumns: string[]) => void,
  isUpToDate: (current: string[]) => boolean = (current) => hasColumnsInOrder(current, snapshot.columns),
): void {
  const current = columnNames(db, "purchase_orders");
  if (isUpToDate(current)) return;

  const indexes = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'purchase_orders' AND sql IS NOT NULL")
    .all() as { sql: string }[];

  db.exec(snapshot.createSql);
  const copied = snapshot.columns.filter((c) => current.includes(c)).join(", ");
  db.exec(`INSERT INTO ${snapshot.tempTable} (${copied}) SELECT ${copied} FROM purchase_orders`);
  afterCopy?.(current);
  db.exec("DROP TABLE purchase_orders");
  db.exec(`ALTER TABLE ${snapshot.tempTable} RENAME TO purchase_orders`);
  for (const { sql } of indexes) {
    db.exec(sql);
  }
}

// Frozen snapshot of purchase_orders as of migration 4 — deliberately NOT shared with db.ts,
// so a later change to the base schema can't silently alter what this historical step does.
const PURCHASE_ORDERS_V4_COLUMNS = [
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

const PURCHASE_ORDERS_V4_SQL = `
  CREATE TABLE purchase_orders_v4 (
    id INTEGER PRIMARY KEY,
    order_number TEXT CHECK (order_number IS NULL OR length(order_number) = 10),
    product_name TEXT NOT NULL CHECK (length(trim(product_name)) BETWEEN 1 AND 100),
    supplier_name TEXT NOT NULL CHECK (length(trim(supplier_name)) BETWEEN 1 AND 100),
    quantity_kg INTEGER NOT NULL CHECK (quantity_kg > 0),
    port_price_per_kg INTEGER NOT NULL CHECK (port_price_per_kg >= 0),
    delivered_price_per_kg INTEGER CHECK (delivered_price_per_kg IS NULL OR delivered_price_per_kg >= 0),
    order_value INTEGER NOT NULL CHECK (order_value >= 0),
    delivered_order_value INTEGER CHECK (delivered_order_value IS NULL OR delivered_order_value >= 0),
    currency_code TEXT NOT NULL CHECK (length(currency_code) = 3 AND currency_code = upper(currency_code)),
    container_number TEXT CHECK (container_number IS NULL OR length(container_number) <= 50),
    eta_port_date TEXT,
    eta_destination_date TEXT,
    warehouse_name TEXT CHECK (warehouse_name IS NULL OR length(trim(warehouse_name)) BETWEEN 1 AND 100),
    has_eur1_certificate INTEGER CHECK (has_eur1_certificate IS NULL OR has_eur1_certificate IN (0, 1)),
    batch_number TEXT CHECK (batch_number IS NULL OR length(batch_number) = 13),
    sent_for_testing_date TEXT,
    test_results TEXT CHECK (test_results IS NULL OR length(test_results) <= 50),
    supplier_lab_results INTEGER CHECK (supplier_lab_results IS NULL OR supplier_lab_results IN (0, 1)),
    taken_for_production INTEGER CHECK (taken_for_production IS NULL OR taken_for_production IN (0, 1)),
    payment_due_date TEXT,
    invoice_number TEXT CHECK (invoice_number IS NULL OR length(invoice_number) <= 30),
    payment_date TEXT,
    delivery_date TEXT,
    is_important INTEGER CHECK (is_important IS NULL OR is_important IN (0, 1)),
    notes TEXT CHECK (notes IS NULL OR length(notes) <= 512),
    is_blocked INTEGER CHECK (is_blocked IS NULL OR is_blocked IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
    updated_at TEXT,
    updated_by TEXT
  );
`;

// Frozen snapshot of purchase_orders as of migration 5 (same rule as V4: never derived from db.ts).
const PURCHASE_ORDERS_V5_COLUMNS = [
  ...PURCHASE_ORDERS_V4_COLUMNS.slice(0, PURCHASE_ORDERS_V4_COLUMNS.indexOf("warehouse_name") + 1),
  "shipping_line",
  ...PURCHASE_ORDERS_V4_COLUMNS.slice(PURCHASE_ORDERS_V4_COLUMNS.indexOf("warehouse_name") + 1),
];

const PURCHASE_ORDERS_V5_SQL = `
  CREATE TABLE purchase_orders_v5 (
    id INTEGER PRIMARY KEY,
    order_number TEXT CHECK (order_number IS NULL OR length(order_number) = 10),
    product_name TEXT NOT NULL CHECK (length(trim(product_name)) BETWEEN 1 AND 100),
    supplier_name TEXT NOT NULL CHECK (length(trim(supplier_name)) BETWEEN 1 AND 100),
    quantity_kg INTEGER NOT NULL CHECK (quantity_kg > 0),
    port_price_per_kg INTEGER NOT NULL CHECK (port_price_per_kg >= 0),
    delivered_price_per_kg INTEGER CHECK (delivered_price_per_kg IS NULL OR delivered_price_per_kg >= 0),
    order_value INTEGER NOT NULL CHECK (order_value >= 0),
    delivered_order_value INTEGER CHECK (delivered_order_value IS NULL OR delivered_order_value >= 0),
    currency_code TEXT NOT NULL CHECK (length(currency_code) = 3 AND currency_code = upper(currency_code)),
    container_number TEXT CHECK (container_number IS NULL OR length(container_number) <= 50),
    eta_port_date TEXT,
    eta_destination_date TEXT,
    warehouse_name TEXT CHECK (warehouse_name IS NULL OR length(trim(warehouse_name)) BETWEEN 1 AND 100),
    shipping_line TEXT CHECK (shipping_line IS NULL OR length(shipping_line) <= 50),
    has_eur1_certificate INTEGER CHECK (has_eur1_certificate IS NULL OR has_eur1_certificate IN (0, 1)),
    batch_number TEXT CHECK (batch_number IS NULL OR length(batch_number) = 13),
    sent_for_testing_date TEXT,
    test_results TEXT CHECK (test_results IS NULL OR length(test_results) <= 50),
    supplier_lab_results INTEGER CHECK (supplier_lab_results IS NULL OR supplier_lab_results IN (0, 1)),
    taken_for_production INTEGER CHECK (taken_for_production IS NULL OR taken_for_production IN (0, 1)),
    payment_due_date TEXT,
    invoice_number TEXT CHECK (invoice_number IS NULL OR length(invoice_number) <= 30),
    payment_date TEXT,
    delivery_date TEXT,
    is_important INTEGER CHECK (is_important IS NULL OR is_important IN (0, 1)),
    notes TEXT CHECK (notes IS NULL OR length(notes) <= 512),
    is_blocked INTEGER CHECK (is_blocked IS NULL OR is_blocked IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
    updated_at TEXT,
    updated_by TEXT
  );
`;

// Migration 6 keeps the v5 column set and only tightens warehouse_name to 1–50 characters.
// Derived from the frozen V5 SQL (not from db.ts), so it stays fixed as well.
const PURCHASE_ORDERS_V6_SQL = PURCHASE_ORDERS_V5_SQL.replace("purchase_orders_v5", "purchase_orders_v6").replace(
  "length(trim(warehouse_name)) BETWEEN 1 AND 100",
  "length(trim(warehouse_name)) BETWEEN 1 AND 50",
);

const WAREHOUSE_NAME_MAX = 50;

// Normalized CREATE TABLE text (whitespace collapsed), or null when the table doesn't exist.
function tableSql(db: Database.Database, table: string): string | null {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(table) as
    | { sql: string }
    | undefined;
  return row ? row.sql.replace(/\s+/g, " ") : null;
}

// Shortens over-long values instead of failing the migration (client decision 2026-11-13):
// trimmed, cut to the limit, then right-trimmed again so the cut can't leave trailing spaces.
// Applied identically to orders and the dictionary, so a shortened order value still matches
// its shortened dictionary entry.
function truncateSql(column: string, max: number): string {
  return `rtrim(substr(trim(${column}), 1, ${String(max)}))`;
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
  {
    version: 3,
    name: "add purchase_orders.warehouse_name",
    up: (db) => {
      if (!hasColumn(db, "purchase_orders", "warehouse_name")) {
        db.exec(
          "ALTER TABLE purchase_orders ADD COLUMN warehouse_name TEXT CHECK (warehouse_name IS NULL OR length(trim(warehouse_name)) BETWEEN 1 AND 100)",
        );
      }
    },
  },
  {
    // Unlike 1–3 this can't be an ADD COLUMN: SQLite only appends columns, and this step also
    // places supplier_lab_results after test_results and moves is_blocked after notes. So the
    // table is rebuilt (create new → copy → drop old → rename), which as a side effect also
    // normalizes legacy databases where migrations 1–3 appended their columns at the end.
    // See rebuildPurchaseOrders for the mechanics and the foreign_keys requirement.
    version: 4,
    name: "add purchase_orders.supplier_lab_results, move is_blocked after notes",
    up: (db) => {
      rebuildPurchaseOrders(
        db,
        { columns: PURCHASE_ORDERS_V4_COLUMNS, createSql: PURCHASE_ORDERS_V4_SQL, tempTable: "purchase_orders_v4" },
        (previousColumns) => {
          // Existing orders get 0 (same as an unchecked box on a new order), not NULL — otherwise the
          // first edit of every pre-existing order would log a spurious "— → Nie" history entry.
          if (!previousColumns.includes("supplier_lab_results")) {
            db.exec("UPDATE purchase_orders_v4 SET supplier_lab_results = 0");
          }
        },
      );
    },
  },
  {
    // Client request: optional text "Armator" (max 50 chars) placed between warehouse_name and
    // has_eur1_certificate (Lp. 15 in the schema doc). Mid-table placement → rebuild, as in 4.
    // Existing rows keep shipping_line = NULL: an empty text field on the form is also saved as
    // NULL, so unlike the checkbox in migration 4 no backfill is needed to avoid spurious history.
    version: 5,
    name: "add purchase_orders.shipping_line after warehouse_name",
    up: (db) => {
      rebuildPurchaseOrders(db, {
        columns: PURCHASE_ORDERS_V5_COLUMNS,
        createSql: PURCHASE_ORDERS_V5_SQL,
        tempTable: "purchase_orders_v5",
      });
    },
  },
  {
    // Client request: warehouse name ("Magazyn") max 50 characters instead of 100 — both on
    // orders and in the warehouses dictionary. SQLite can't alter a CHECK, so both tables are
    // rebuilt. Longer existing values are shortened first (see truncateSql); shortening may make
    // two dictionary names equal, so the dictionary copy uses INSERT OR IGNORE (UNIQUE(name)).
    version: 6,
    name: "limit warehouse_name and warehouses.name to 50 characters",
    up: (db) => {
      const limit = `length(trim(warehouse_name)) BETWEEN 1 AND ${String(WAREHOUSE_NAME_MAX)}`;
      if (!tableSql(db, "purchase_orders")?.includes(limit)) {
        db.exec(
          `UPDATE purchase_orders SET warehouse_name = ${truncateSql("warehouse_name", WAREHOUSE_NAME_MAX)}
           WHERE length(trim(warehouse_name)) > ${String(WAREHOUSE_NAME_MAX)}`,
        );
        rebuildPurchaseOrders(
          db,
          { columns: PURCHASE_ORDERS_V5_COLUMNS, createSql: PURCHASE_ORDERS_V6_SQL, tempTable: "purchase_orders_v6" },
          undefined,
          () => false,
        );
      }

      const warehousesSql = tableSql(db, "warehouses");
      if (warehousesSql && !warehousesSql.includes(`length(trim(name)) BETWEEN 1 AND ${String(WAREHOUSE_NAME_MAX)}`)) {
        db.exec(`
          CREATE TABLE warehouses_v6 (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND ${String(WAREHOUSE_NAME_MAX)}),
            UNIQUE (name)
          );
          INSERT OR IGNORE INTO warehouses_v6 (id, name)
            SELECT id, CASE WHEN length(trim(name)) > ${String(WAREHOUSE_NAME_MAX)}
                            THEN ${truncateSql("name", WAREHOUSE_NAME_MAX)} ELSE name END
            FROM warehouses ORDER BY id;
          DROP TABLE warehouses;
          ALTER TABLE warehouses_v6 RENAME TO warehouses;
        `);
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
  if (pending.length === 0) return;

  // Table rebuilds (migrations 4–6) must run with foreign keys off — otherwise DROP TABLE on
  // purchase_orders cascades into purchase_order_history. The pragma is a no-op inside a
  // transaction, so it's toggled out here; integrity is re-checked before each commit instead.
  const foreignKeysWereOn = db.pragma("foreign_keys", { simple: true }) === 1;
  if (foreignKeysWereOn) db.pragma("foreign_keys = OFF");

  try {
    for (const migration of pending) {
      const apply = db.transaction(() => {
        migration.up(db);
        const violations = db.pragma("foreign_key_check") as unknown[];
        if (violations.length > 0) {
          throw new Error(
            `Migration ${String(migration.version)} left ${String(violations.length)} foreign key violation(s)`,
          );
        }
        db.prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?)").run(
          migration.version,
          migration.name,
        );
      });
      apply();
    }
  } finally {
    if (foreignKeysWereOn) db.pragma("foreign_keys = ON");
  }
}
