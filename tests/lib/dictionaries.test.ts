import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  createDictionaryEntry,
  deleteDictionaryEntry,
  dictionaryLabel,
  isDictionaryKind,
  listDictionaryEntries,
  updateDictionaryEntry,
} from "@/lib/dictionaries";

beforeEach(() => {
  db.exec("DELETE FROM products; DELETE FROM suppliers; DELETE FROM currencies;");
});

describe("isDictionaryKind", () => {
  it("accepts the three known kinds and rejects anything else", () => {
    expect(isDictionaryKind("products")).toBe(true);
    expect(isDictionaryKind("suppliers")).toBe(true);
    expect(isDictionaryKind("currencies")).toBe(true);
    expect(isDictionaryKind("statuses")).toBe(false);
  });
});

describe("dictionaryLabel", () => {
  it("returns a human label for each kind", () => {
    expect(dictionaryLabel("products")).toBe("Towary");
    expect(dictionaryLabel("currencies")).toBe("Waluty");
  });
});

describe("products/suppliers dictionaries", () => {
  it("creates, lists, updates and deletes an entry", () => {
    const created = createDictionaryEntry("products", "  Jabłka  ");
    expect(created.ok).toBe(true);

    const entries = listDictionaryEntries("products");
    expect(entries).toHaveLength(1);
    expect(entries[0].value).toBe("Jabłka");

    const updated = updateDictionaryEntry("products", entries[0].id, "Gruszki");
    expect(updated.ok).toBe(true);
    expect(listDictionaryEntries("products")[0].value).toBe("Gruszki");

    deleteDictionaryEntry("products", entries[0].id);
    expect(listDictionaryEntries("products")).toHaveLength(0);
  });

  it("rejects a duplicate value", () => {
    createDictionaryEntry("suppliers", "Acme Fruits");
    const result = createDictionaryEntry("suppliers", "Acme Fruits");
    expect(result.ok).toBe(false);
  });

  it("rejects an empty or over-length value", () => {
    expect(createDictionaryEntry("suppliers", "").ok).toBe(false);
    expect(createDictionaryEntry("suppliers", "x".repeat(101)).ok).toBe(false);
  });
});

describe("currencies dictionary", () => {
  it("normalizes the code to uppercase", () => {
    createDictionaryEntry("currencies", "gbp");
    expect(listDictionaryEntries("currencies").map((e) => e.value)).toContain("GBP");
  });

  it("rejects a code that isn't exactly 3 letters", () => {
    expect(createDictionaryEntry("currencies", "EU").ok).toBe(false);
    expect(createDictionaryEntry("currencies", "EURO").ok).toBe(false);
    expect(createDictionaryEntry("currencies", "12A").ok).toBe(false);
  });
});
