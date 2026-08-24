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

export function listOrders(): PurchaseOrderRow[] {
  return db.prepare("SELECT * FROM purchase_orders ORDER BY created_at DESC").all() as PurchaseOrderRow[];
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
