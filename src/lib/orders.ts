import {
  db,
  type CurrencyRow,
  type ProductRow,
  type PurchaseOrderHistoryRow,
  type PurchaseOrderRow,
  type SupplierRow,
  type WarehouseRow,
} from "@/lib/db";
import { formatMoney } from "@/lib/money";

export function listProducts(): ProductRow[] {
  return db.prepare("SELECT id, name FROM products ORDER BY name").all() as ProductRow[];
}

export function listSuppliers(): SupplierRow[] {
  return db.prepare("SELECT id, name FROM suppliers ORDER BY name").all() as SupplierRow[];
}

export function listWarehouses(): WarehouseRow[] {
  return db.prepare("SELECT id, name FROM warehouses ORDER BY name").all() as WarehouseRow[];
}

export function listCurrencies(): CurrencyRow[] {
  return db.prepare("SELECT id, code FROM currencies ORDER BY code").all() as CurrencyRow[];
}

// A record needs attention when: the ETA is within this many days (or already past) and the
// delivery hasn't been confirmed yet, or the delivery is done but lab results are still missing,
// or a user manually flagged it as important (PRD Business Logic / FR-012).
const ATTENTION_DAYS_AHEAD = 3;
const ATTENTION_MANUAL_SQL = `(COALESCE(is_important, 0) = 1)`;
const ATTENTION_ETA_SQL = `(eta_destination_date IS NOT NULL AND delivery_date IS NULL
  AND eta_destination_date <= date('now', '+${String(ATTENTION_DAYS_AHEAD)} days'))`;
const ATTENTION_NO_TEST_RESULTS_SQL = `(delivery_date IS NOT NULL AND test_results IS NULL)`;
const NEEDS_ATTENTION_SQL = `(${ATTENTION_MANUAL_SQL} OR ${ATTENTION_ETA_SQL} OR ${ATTENTION_NO_TEST_RESULTS_SQL})`;

// Each rule is also selected on its own so the UI can tell the user *why* a row is flagged —
// otherwise unchecking "Ważne" on an order that still matches an automatic rule looks like a bug.
const ATTENTION_COLUMNS_SQL = `${NEEDS_ATTENTION_SQL} AS needs_attention,
  ${ATTENTION_MANUAL_SQL} AS attention_manual,
  ${ATTENTION_ETA_SQL} AS attention_eta,
  ${ATTENTION_NO_TEST_RESULTS_SQL} AS attention_no_test_results`;

const OVERDUE_PAYMENT_SQL = `(
  payment_due_date IS NOT NULL AND payment_due_date < date('now') AND payment_date IS NULL
)`;

// Matches the "W realizacji" status dot shown in the orders list/report: not blocked and not yet delivered.
const IN_PROGRESS_SQL = `(is_blocked = 0 AND delivery_date IS NULL)`;

// NULL counts as missing too — only an explicit "Tak" means the supplier sent lab results.
const MISSING_SUPPLIER_LAB_SQL = `(COALESCE(supplier_lab_results, 0) = 0)`;

export type PurchaseOrderWithFlag = PurchaseOrderRow & {
  needs_attention: 0 | 1;
  attention_manual: 0 | 1;
  attention_eta: 0 | 1;
  attention_no_test_results: 0 | 1;
};

export function attentionReasons(order: PurchaseOrderWithFlag): string[] {
  const reasons: string[] = [];
  if (order.attention_manual === 1) reasons.push("Oznaczone ręcznie jako ważne");
  if (order.attention_eta === 1) {
    reasons.push(`ETA cel w ciągu ${String(ATTENTION_DAYS_AHEAD)} dni lub minęła, brak daty dostawy`);
  }
  if (order.attention_no_test_results === 1) reasons.push("Dostawa zakończona, brak wyniku badań");
  return reasons;
}

export interface OrderFilters {
  q: string | null;
  product: string | null;
  supplier: string | null;
  currency: string | null;
  etaFrom: string | null;
  etaTo: string | null;
  onlyAttention: boolean;
  onlyBlocked: boolean;
  onlyOverduePayment: boolean;
  onlyInProgress: boolean;
  onlyMissingSupplierLabResults: boolean;
}

const emptyFilters: OrderFilters = {
  q: null,
  product: null,
  supplier: null,
  currency: null,
  etaFrom: null,
  etaTo: null,
  onlyAttention: false,
  onlyBlocked: false,
  onlyOverduePayment: false,
  onlyInProgress: false,
  onlyMissingSupplierLabResults: false,
};

// Filters travel as URL query params and are never persisted server-side, so the view stays
// shared/default for everyone — no user's search silently changes what another user sees (FR-005).
export function listOrders(filters: Partial<OrderFilters> = {}): PurchaseOrderWithFlag[] {
  const f = { ...emptyFilters, ...filters };

  return db
    .prepare(
      `SELECT *, ${ATTENTION_COLUMNS_SQL} FROM purchase_orders
       WHERE (@q IS NULL OR
         order_number LIKE '%' || @q || '%' OR
         product_name LIKE '%' || @q || '%' OR
         supplier_name LIKE '%' || @q || '%' OR
         container_number LIKE '%' || @q || '%' OR
         notes LIKE '%' || @q || '%')
         AND (@product IS NULL OR product_name = @product)
         AND (@supplier IS NULL OR supplier_name = @supplier)
         AND (@currency IS NULL OR currency_code = @currency)
         AND (@etaFrom IS NULL OR eta_destination_date >= @etaFrom)
         AND (@etaTo IS NULL OR eta_destination_date <= @etaTo)
         AND (@onlyAttention = 0 OR ${NEEDS_ATTENTION_SQL})
         AND (@onlyBlocked = 0 OR is_blocked = 1)
         AND (@onlyOverduePayment = 0 OR ${OVERDUE_PAYMENT_SQL})
         AND (@onlyInProgress = 0 OR ${IN_PROGRESS_SQL})
         AND (@onlyMissingSupplierLabResults = 0 OR ${MISSING_SUPPLIER_LAB_SQL})
       ORDER BY created_at DESC`,
    )
    .all({
      ...f,
      onlyAttention: f.onlyAttention ? 1 : 0,
      onlyBlocked: f.onlyBlocked ? 1 : 0,
      onlyOverduePayment: f.onlyOverduePayment ? 1 : 0,
      onlyInProgress: f.onlyInProgress ? 1 : 0,
      onlyMissingSupplierLabResults: f.onlyMissingSupplierLabResults ? 1 : 0,
    }) as PurchaseOrderWithFlag[];
}

export interface OrderFilterOptions {
  products: string[];
  suppliers: string[];
  currencies: string[];
}

// Options are drawn from values actually used on existing orders, not the full dictionaries,
// so a filter dropdown never offers a value that would return zero rows.
export function listOrderFilterOptions(): OrderFilterOptions {
  const products = db
    .prepare("SELECT DISTINCT product_name AS name FROM purchase_orders ORDER BY product_name")
    .all() as { name: string }[];
  const suppliers = db
    .prepare("SELECT DISTINCT supplier_name AS name FROM purchase_orders ORDER BY supplier_name")
    .all() as { name: string }[];
  const currencies = db
    .prepare("SELECT DISTINCT currency_code AS code FROM purchase_orders ORDER BY currency_code")
    .all() as { code: string }[];

  return {
    products: products.map((p) => p.name),
    suppliers: suppliers.map((s) => s.name),
    currencies: currencies.map((c) => c.code),
  };
}

export interface OrderInput {
  orderNumber: string | null;
  productName: string;
  supplierName: string;
  quantityKg: number;
  portPricePerKg: number;
  orderValue: number;
  deliveredOrderValue: number | null;
  currencyCode: string;
  containerNumber: string | null;
  etaPortDate: string | null;
  etaDestinationDate: string | null;
  warehouseName: string | null;
  shippingLine: string | null;
  hasEur1Certificate: 0 | 1 | null;
  deliveredPricePerKg: number | null;
  batchNumber: string | null;
  sentForTestingDate: string | null;
  testResults: string | null;
  supplierLabResults: 0 | 1 | null;
  takenForProduction: 0 | 1 | null;
  paymentDueDate: string | null;
  invoiceNumber: string | null;
  paymentDate: string | null;
  deliveryDate: string | null;
  isImportant: 0 | 1 | null;
  notes: string | null;
  isBlocked: 0 | 1 | null;
}

export interface NewOrderInput extends OrderInput {
  createdBy: string;
}

export interface UpdateOrderInput extends OrderInput {
  updatedBy: string;
}

export function getOrderById(id: number): PurchaseOrderRow | undefined {
  return db.prepare("SELECT * FROM purchase_orders WHERE id = ?").get(id) as PurchaseOrderRow | undefined;
}

// No DB-level UNIQUE constraint on order_number/batch_number (would risk breaking on
// startup against pre-existing historical duplicates in an already-deployed database),
// so uniqueness is enforced here at write time instead, excluding the row being edited.
export function isOrderNumberTaken(orderNumber: string, excludeId?: number): boolean {
  const row = db
    .prepare("SELECT id FROM purchase_orders WHERE order_number = @orderNumber AND id != @excludeId")
    .get({ orderNumber, excludeId: excludeId ?? -1 });
  return row !== undefined;
}

export function isBatchNumberTaken(batchNumber: string, excludeId?: number): boolean {
  const row = db
    .prepare("SELECT id FROM purchase_orders WHERE batch_number = @batchNumber AND id != @excludeId")
    .get({ batchNumber, excludeId: excludeId ?? -1 });
  return row !== undefined;
}

// product_name/supplier_name are picked from a combobox that also accepts free text (dictionary
// management UI doesn't exist yet), so a new value is added to the dictionary as it's used.
export function createOrder(input: NewOrderInput): void {
  const insertOrder = db.prepare(
    `INSERT INTO purchase_orders
      (order_number, product_name, supplier_name, quantity_kg, port_price_per_kg, order_value,
       delivered_order_value, currency_code, container_number, eta_port_date, eta_destination_date,
       warehouse_name, shipping_line, has_eur1_certificate, delivered_price_per_kg, batch_number, sent_for_testing_date,
       test_results, supplier_lab_results, taken_for_production, payment_due_date, invoice_number,
       payment_date, delivery_date, is_important, notes, is_blocked, created_by)
     VALUES (@orderNumber, @productName, @supplierName, @quantityKg, @portPricePerKg, @orderValue,
       @deliveredOrderValue, @currencyCode, @containerNumber, @etaPortDate, @etaDestinationDate,
       @warehouseName, @shippingLine, @hasEur1Certificate, @deliveredPricePerKg, @batchNumber, @sentForTestingDate,
       @testResults, @supplierLabResults, @takenForProduction, @paymentDueDate, @invoiceNumber,
       @paymentDate, @deliveryDate, @isImportant, @notes, @isBlocked, @createdBy)`,
  );

  const insertAll = db.transaction((order: NewOrderInput) => {
    db.prepare("INSERT OR IGNORE INTO products (name) VALUES (?)").run(order.productName);
    db.prepare("INSERT OR IGNORE INTO suppliers (name) VALUES (?)").run(order.supplierName);
    if (order.warehouseName) {
      db.prepare("INSERT OR IGNORE INTO warehouses (name) VALUES (?)").run(order.warehouseName);
    }
    insertOrder.run(order);
  });

  insertAll(input);
}

type HistoryFormat = "text" | "money" | "bool" | "date";

// Maps each editable DB column to its label/format for the change-history view (FR-010).
// Keys match purchase_orders columns, not the camelCase UpdateOrderInput keys, since the diff
// is computed against the row read back from the DB.
const HISTORY_FIELDS: { column: keyof PurchaseOrderRow; label: string; format: HistoryFormat }[] = [
  { column: "order_number", label: "Numer zamówienia (CRM)", format: "text" },
  { column: "product_name", label: "Towar", format: "text" },
  { column: "supplier_name", label: "Dostawca", format: "text" },
  { column: "quantity_kg", label: "Ilość (kg)", format: "text" },
  { column: "port_price_per_kg", label: "Cena portowa / kg", format: "money" },
  { column: "delivered_price_per_kg", label: "Cena po dostawie / kg", format: "money" },
  { column: "order_value", label: "Wartość zamówienia", format: "money" },
  { column: "delivered_order_value", label: "Wartość zamówienia po dostawie", format: "money" },
  { column: "currency_code", label: "Waluta", format: "text" },
  { column: "container_number", label: "Numer kontenera", format: "text" },
  { column: "eta_port_date", label: "ETA port", format: "date" },
  { column: "eta_destination_date", label: "ETA cel", format: "date" },
  { column: "warehouse_name", label: "Magazyn", format: "text" },
  { column: "shipping_line", label: "Armator", format: "text" },
  { column: "has_eur1_certificate", label: "Certyfikat EUR.1", format: "bool" },
  { column: "batch_number", label: "Numer partii", format: "text" },
  { column: "sent_for_testing_date", label: "Data wysłania do badań", format: "date" },
  { column: "test_results", label: "Wynik badań", format: "text" },
  { column: "supplier_lab_results", label: "Badania laboratoryjne od dostawcy", format: "bool" },
  { column: "taken_for_production", label: "Pobrane do produkcji", format: "bool" },
  { column: "payment_due_date", label: "Termin płatności", format: "date" },
  { column: "invoice_number", label: "Numer faktury", format: "text" },
  { column: "payment_date", label: "Data płatności", format: "date" },
  { column: "delivery_date", label: "Data dostawy", format: "date" },
  { column: "is_important", label: "Ważne", format: "bool" },
  { column: "notes", label: "Uwagi", format: "text" },
  { column: "is_blocked", label: "Zablokowane", format: "bool" },
];

function formatHistoryValue(value: PurchaseOrderRow[keyof PurchaseOrderRow], format: HistoryFormat): string {
  if (value === null || value === "") return "—";
  if (format === "money") return formatMoney(value as number);
  if (format === "bool") return value === 1 ? "Tak" : "Nie";
  return String(value);
}

export interface OrderHistoryChange {
  label: string;
  oldValue: string;
  newValue: string;
}

export interface OrderHistoryEntry {
  id: number;
  editedBy: string;
  editedAt: string;
  changes: OrderHistoryChange[];
}

export function getOrderHistory(orderId: number): OrderHistoryEntry[] {
  const rows = db
    .prepare("SELECT * FROM purchase_order_history WHERE order_id = ? ORDER BY edited_at DESC, id DESC")
    .all(orderId) as PurchaseOrderHistoryRow[];

  return rows.map((row) => ({
    id: row.id,
    editedBy: row.edited_by,
    editedAt: row.edited_at,
    changes: JSON.parse(row.changes) as OrderHistoryChange[],
  }));
}

// product_name/supplier_name are picked from a combobox that also accepts free text, so a new
// value used on edit is added to the dictionary the same way createOrder does.
export function updateOrder(id: number, input: UpdateOrderInput): void {
  const before = getOrderById(id);
  const updateOrderStmt = db.prepare(
    `UPDATE purchase_orders SET
       order_number = @orderNumber,
       product_name = @productName,
       supplier_name = @supplierName,
       quantity_kg = @quantityKg,
       port_price_per_kg = @portPricePerKg,
       order_value = @orderValue,
       delivered_order_value = @deliveredOrderValue,
       currency_code = @currencyCode,
       container_number = @containerNumber,
       eta_port_date = @etaPortDate,
       eta_destination_date = @etaDestinationDate,
       warehouse_name = @warehouseName,
       shipping_line = @shippingLine,
       has_eur1_certificate = @hasEur1Certificate,
       delivered_price_per_kg = @deliveredPricePerKg,
       batch_number = @batchNumber,
       sent_for_testing_date = @sentForTestingDate,
       test_results = @testResults,
       supplier_lab_results = @supplierLabResults,
       taken_for_production = @takenForProduction,
       payment_due_date = @paymentDueDate,
       invoice_number = @invoiceNumber,
       payment_date = @paymentDate,
       delivery_date = @deliveryDate,
       is_important = @isImportant,
       notes = @notes,
       is_blocked = @isBlocked,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
       updated_by = @updatedBy
     WHERE id = @id`,
  );

  const insertHistory = db.prepare(
    "INSERT INTO purchase_order_history (order_id, edited_by, changes) VALUES (@orderId, @editedBy, @changes)",
  );

  const updateAll = db.transaction((order: UpdateOrderInput & { id: number }) => {
    db.prepare("INSERT OR IGNORE INTO products (name) VALUES (?)").run(order.productName);
    db.prepare("INSERT OR IGNORE INTO suppliers (name) VALUES (?)").run(order.supplierName);
    if (order.warehouseName) {
      db.prepare("INSERT OR IGNORE INTO warehouses (name) VALUES (?)").run(order.warehouseName);
    }
    updateOrderStmt.run(order);

    const after = getOrderById(order.id);
    if (!before || !after) return;

    const changes: OrderHistoryChange[] = HISTORY_FIELDS.filter(
      (field) => before[field.column] !== after[field.column],
    ).map((field) => ({
      label: field.label,
      oldValue: formatHistoryValue(before[field.column], field.format),
      newValue: formatHistoryValue(after[field.column], field.format),
    }));

    if (changes.length > 0) {
      insertHistory.run({ orderId: order.id, editedBy: order.updatedBy, changes: JSON.stringify(changes) });
    }
  });

  updateAll({ ...input, id });
}

export function deleteOrder(id: number): void {
  db.prepare("DELETE FROM purchase_orders WHERE id = ?").run(id);
}

export interface ReportFilters {
  dateFrom: string | null;
  dateTo: string | null;
}

// Reports are scoped to eta_destination_date — the same field the orders list already
// filters on ("Dostawa od/do") — so the two views agree on what "date range" means (FR-009).
export function listOrdersForReport(filters: ReportFilters): PurchaseOrderWithFlag[] {
  return db
    .prepare(
      `SELECT *, ${ATTENTION_COLUMNS_SQL} FROM purchase_orders
       WHERE (@dateFrom IS NULL OR eta_destination_date >= @dateFrom)
         AND (@dateTo IS NULL OR eta_destination_date <= @dateTo)
       ORDER BY eta_destination_date ASC, created_at ASC`,
    )
    .all(filters) as PurchaseOrderWithFlag[];
}

export interface CurrencyTotal {
  currencyCode: string;
  total: number;
}

// Summed separately per currency at the SQL level so values are never mixed across
// currencies in one total (US-01 acceptance criteria).
export function sumOrderValueByCurrency(filters: ReportFilters): CurrencyTotal[] {
  const rows = db
    .prepare(
      `SELECT currency_code AS currencyCode, SUM(order_value) AS total FROM purchase_orders
       WHERE (@dateFrom IS NULL OR eta_destination_date >= @dateFrom)
         AND (@dateTo IS NULL OR eta_destination_date <= @dateTo)
       GROUP BY currency_code
       ORDER BY currency_code`,
    )
    .all(filters) as CurrencyTotal[];
  return rows;
}

export interface DashboardStats {
  needsAttentionCount: number;
  blockedCount: number;
  overduePaymentCount: number;
  missingSupplierLabResultsCount: number;
  inProgressTotals: CurrencyTotal[];
}

// Deliberately just a handful of counters/sums linking into the existing filtered orders
// list, not a full analytics view — PRD Non-Goals rules out "zaawansowana analityka BI".
export function getDashboardStats(): DashboardStats {
  const needsAttentionCount = (
    db.prepare(`SELECT COUNT(*) AS c FROM purchase_orders WHERE ${NEEDS_ATTENTION_SQL}`).get() as { c: number }
  ).c;
  const blockedCount = (
    db.prepare("SELECT COUNT(*) AS c FROM purchase_orders WHERE is_blocked = 1").get() as { c: number }
  ).c;
  const overduePaymentCount = (
    db.prepare(`SELECT COUNT(*) AS c FROM purchase_orders WHERE ${OVERDUE_PAYMENT_SQL}`).get() as { c: number }
  ).c;
  const missingSupplierLabResultsCount = (
    db.prepare(`SELECT COUNT(*) AS c FROM purchase_orders WHERE ${MISSING_SUPPLIER_LAB_SQL}`).get() as { c: number }
  ).c;
  const inProgressTotals = db
    .prepare(
      `SELECT currency_code AS currencyCode, SUM(order_value) AS total FROM purchase_orders
       WHERE delivery_date IS NULL
       GROUP BY currency_code
       ORDER BY currency_code`,
    )
    .all() as CurrencyTotal[];

  return { needsAttentionCount, blockedCount, overduePaymentCount, missingSupplierLabResultsCount, inProgressTotals };
}
