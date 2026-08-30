import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  createOrder,
  deleteOrder,
  getDashboardStats,
  getOrderById,
  getOrderHistory,
  isBatchNumberTaken,
  isOrderNumberTaken,
  listOrders,
  listOrdersForReport,
  listProducts,
  listSuppliers,
  sumOrderValueByCurrency,
  updateOrder,
  type NewOrderInput,
} from "@/lib/orders";

beforeEach(() => {
  db.exec("DELETE FROM purchase_order_history; DELETE FROM purchase_orders;");
});

function daysFromNow(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// Checkbox-backed fields (isBlocked, isImportant, etc.) default to 0, not null, because the real
// form parser (orders-form.ts) always sends 0/1 for these — `form.get(...) ? 1 : 0` never produces
// null. Using null here would exercise a SQL three-valued-logic corner case
// (`is_important = 1` is NULL, not 0, when is_important IS NULL) that real submissions never hit.
function baseInput(overrides: Partial<NewOrderInput> = {}): NewOrderInput {
  return {
    orderNumber: null,
    productName: "Jabłka",
    supplierName: "Acme Fruits",
    quantityKg: 1000,
    portPricePerKg: 15000,
    orderValue: 1000 * 15000,
    deliveredOrderValue: null,
    currencyCode: "EUR",
    containerNumber: null,
    etaPortDate: null,
    etaDestinationDate: null,
    hasEur1Certificate: 0,
    deliveredPricePerKg: null,
    batchNumber: null,
    sentForTestingDate: null,
    testResults: null,
    isBlocked: 0,
    takenForProduction: 0,
    paymentDueDate: null,
    invoiceNumber: null,
    paymentDate: null,
    deliveryDate: null,
    isImportant: 0,
    notes: null,
    createdBy: "tester",
    ...overrides,
  };
}

describe("createOrder", () => {
  it("creates a row retrievable via getOrderById", () => {
    createOrder(baseInput({ productName: "Wiśnie" }));
    const [order] = listOrders();
    expect(order.product_name).toBe("Wiśnie");
    expect(getOrderById(order.id)?.product_name).toBe("Wiśnie");
  });

  it("auto-adds a new product/supplier name to the dictionary", () => {
    createOrder(baseInput({ productName: "Owoc Testowy XYZ", supplierName: "Dostawca Testowy XYZ" }));
    expect(listProducts().some((p) => p.name === "Owoc Testowy XYZ")).toBe(true);
    expect(listSuppliers().some((s) => s.name === "Dostawca Testowy XYZ")).toBe(true);
  });
});

describe("deleteOrder", () => {
  it("removes the row", () => {
    createOrder(baseInput({}));
    const [order] = listOrders();
    deleteOrder(order.id);
    expect(getOrderById(order.id)).toBeUndefined();
  });
});

describe("isOrderNumberTaken / isBatchNumberTaken", () => {
  it("flags a duplicate order_number as taken, excluding the row being edited", () => {
    createOrder(baseInput({ orderNumber: "AB12345678" }));
    const [order] = listOrders();
    expect(isOrderNumberTaken("AB12345678")).toBe(true);
    expect(isOrderNumberTaken("AB12345678", order.id)).toBe(false);
    expect(isOrderNumberTaken("ZZ99999999")).toBe(false);
  });

  it("flags a duplicate batch_number as taken, excluding the row being edited", () => {
    createOrder(baseInput({ batchNumber: "1234567890123" }));
    const [order] = listOrders();
    expect(isBatchNumberTaken("1234567890123")).toBe(true);
    expect(isBatchNumberTaken("1234567890123", order.id)).toBe(false);
  });
});

describe("updateOrder change history (FR-010)", () => {
  it("records only the fields that actually changed, with the editor's name", () => {
    createOrder(baseInput({ productName: "Jabłka", isBlocked: 0 }));
    const [order] = listOrders();

    updateOrder(order.id, { ...baseInput({ productName: "Gruszki", isBlocked: 1 }), updatedBy: "editor" });

    const history = getOrderHistory(order.id);
    expect(history).toHaveLength(1);
    expect(history[0].editedBy).toBe("editor");

    const labels = history[0].changes.map((c) => c.label);
    expect(labels).toContain("Towar");
    expect(labels).toContain("Zablokowane");
    expect(labels).not.toContain("Dostawca");
  });

  it("records no history entry when nothing changed", () => {
    createOrder(baseInput({}));
    const [order] = listOrders();

    updateOrder(order.id, { ...baseInput({}), updatedBy: "editor" });

    expect(getOrderHistory(order.id)).toHaveLength(0);
  });
});

describe("listOrders filters (FR-005)", () => {
  it("q searches across product, supplier, order_number and notes", () => {
    createOrder(baseInput({ productName: "Unikalny Owoc 123" }));
    createOrder(baseInput({ productName: "Coś innego" }));

    const results = listOrders({ q: "Unikalny" });
    expect(results).toHaveLength(1);
    expect(results[0].product_name).toBe("Unikalny Owoc 123");
  });

  it("onlyBlocked returns only blocked orders", () => {
    createOrder(baseInput({ isBlocked: 1 }));
    createOrder(baseInput({ isBlocked: 0 }));

    const results = listOrders({ onlyBlocked: true });
    expect(results).toHaveLength(1);
    expect(results[0].is_blocked).toBe(1);
  });

  it("onlyOverduePayment returns orders with a past due date and no payment yet", () => {
    createOrder(baseInput({ paymentDueDate: daysFromNow(-5) }));
    createOrder(baseInput({ paymentDueDate: daysFromNow(5) }));
    createOrder(baseInput({ paymentDueDate: daysFromNow(-5), paymentDate: daysFromNow(-1) }));

    expect(listOrders({ onlyOverduePayment: true })).toHaveLength(1);
  });
});

describe("needs_attention derivation (FR-012 / Business Logic)", () => {
  it("flags a manually-important order regardless of dates", () => {
    createOrder(baseInput({ isImportant: 1, etaDestinationDate: daysFromNow(30) }));
    expect(listOrders()[0].needs_attention).toBe(1);
  });

  it("flags an order whose delivery ETA is within the attention window and not yet delivered", () => {
    createOrder(baseInput({ etaDestinationDate: daysFromNow(2) }));
    expect(listOrders()[0].needs_attention).toBe(1);
  });

  it("does not flag an order with a distant ETA and no other trigger", () => {
    createOrder(baseInput({ etaDestinationDate: daysFromNow(10) }));
    expect(listOrders()[0].needs_attention).toBe(0);
  });

  it("flags a delivered order still missing lab test results", () => {
    createOrder(baseInput({ etaDestinationDate: daysFromNow(10), deliveryDate: daysFromNow(-1) }));
    expect(listOrders()[0].needs_attention).toBe(1);
  });

  it("does not flag a delivered order once lab test results are recorded", () => {
    createOrder(baseInput({ etaDestinationDate: daysFromNow(10), deliveryDate: daysFromNow(-1), testResults: "OK" }));
    expect(listOrders()[0].needs_attention).toBe(0);
  });
});

describe("reporting (FR-009)", () => {
  it("sums order values per currency without mixing currencies", () => {
    createOrder(baseInput({ currencyCode: "EUR", orderValue: 1_000_000, etaDestinationDate: daysFromNow(0) }));
    createOrder(baseInput({ currencyCode: "USD", orderValue: 500_000, etaDestinationDate: daysFromNow(0) }));
    createOrder(baseInput({ currencyCode: "EUR", orderValue: 250_000, etaDestinationDate: daysFromNow(0) }));

    const totals = sumOrderValueByCurrency({ dateFrom: null, dateTo: null });
    expect(totals.find((t) => t.currencyCode === "EUR")?.total).toBe(1_250_000);
    expect(totals.find((t) => t.currencyCode === "USD")?.total).toBe(500_000);
  });

  it("scopes results to the eta_destination_date range", () => {
    createOrder(baseInput({ etaDestinationDate: daysFromNow(-30) }));
    createOrder(baseInput({ etaDestinationDate: daysFromNow(0) }));

    const inRange = listOrdersForReport({ dateFrom: daysFromNow(-1), dateTo: daysFromNow(1) });
    expect(inRange).toHaveLength(1);
  });
});

describe("getDashboardStats", () => {
  it("counts blocked/overdue/needs-attention orders and totals in-progress value per currency", () => {
    createOrder(baseInput({ isBlocked: 1 }));
    createOrder(baseInput({ paymentDueDate: daysFromNow(-1) }));
    createOrder(baseInput({ isImportant: 1, currencyCode: "USD", orderValue: 10_000 }));

    const stats = getDashboardStats();
    expect(stats.blockedCount).toBe(1);
    expect(stats.overduePaymentCount).toBe(1);
    expect(stats.needsAttentionCount).toBe(1);
    expect(stats.inProgressTotals.find((t) => t.currencyCode === "USD")?.total).toBe(10_000);
  });
});
