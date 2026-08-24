import { db, type CurrencyRow, type ProductRow, type PurchaseOrderRow, type SupplierRow } from "@/lib/db";

export function listProducts(): ProductRow[] {
  return db.prepare("SELECT id, name FROM products ORDER BY name").all() as ProductRow[];
}

export function listSuppliers(): SupplierRow[] {
  return db.prepare("SELECT id, name FROM suppliers ORDER BY name").all() as SupplierRow[];
}

export function listCurrencies(): CurrencyRow[] {
  return db.prepare("SELECT id, code FROM currencies ORDER BY code").all() as CurrencyRow[];
}

export interface OrderFilters {
  q: string | null;
  product: string | null;
  supplier: string | null;
  currency: string | null;
  etaFrom: string | null;
  etaTo: string | null;
}

const emptyFilters: OrderFilters = {
  q: null,
  product: null,
  supplier: null,
  currency: null,
  etaFrom: null,
  etaTo: null,
};

// Filters travel as URL query params and are never persisted server-side, so the view stays
// shared/default for everyone — no user's search silently changes what another user sees (FR-005).
export function listOrders(filters: Partial<OrderFilters> = {}): PurchaseOrderRow[] {
  const f = { ...emptyFilters, ...filters };

  return db
    .prepare(
      `SELECT * FROM purchase_orders
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
       ORDER BY created_at DESC`,
    )
    .all(f) as PurchaseOrderRow[];
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

export interface NewOrderInput {
  orderNumber: string | null;
  productName: string;
  supplierName: string;
  quantityKg: number;
  portPricePerKg: number;
  orderValue: number;
  currencyCode: string;
  containerNumber: string | null;
  etaPortDate: string | null;
  etaDestinationDate: string | null;
  hasEur1Certificate: 0 | 1 | null;
  notes: string | null;
  createdBy: string;
}

// product_name/supplier_name are picked from a combobox that also accepts free text (dictionary
// management UI doesn't exist yet), so a new value is added to the dictionary as it's used.
export function createOrder(input: NewOrderInput): void {
  const insertOrder = db.prepare(
    `INSERT INTO purchase_orders
      (order_number, product_name, supplier_name, quantity_kg, port_price_per_kg, order_value,
       currency_code, container_number, eta_port_date, eta_destination_date, has_eur1_certificate,
       notes, created_by)
     VALUES (@orderNumber, @productName, @supplierName, @quantityKg, @portPricePerKg, @orderValue,
       @currencyCode, @containerNumber, @etaPortDate, @etaDestinationDate, @hasEur1Certificate,
       @notes, @createdBy)`,
  );

  const insertAll = db.transaction((order: NewOrderInput) => {
    db.prepare("INSERT OR IGNORE INTO products (name) VALUES (?)").run(order.productName);
    db.prepare("INSERT OR IGNORE INTO suppliers (name) VALUES (?)").run(order.supplierName);
    insertOrder.run(order);
  });

  insertAll(input);
}
