import { db } from "@/lib/db";

export type DictionaryKind = "products" | "suppliers" | "currencies";

export interface DictionaryEntry {
  id: number;
  value: string;
}

interface DictionaryConfig {
  table: "products" | "suppliers" | "currencies";
  column: "name" | "code";
  label: string;
  normalize: (raw: string) => string;
  validate: (value: string) => string | null;
}

// table/column come only from this fixed map, never from request input, so interpolating
// them into SQL below is safe — the untrusted part (kind) is checked against this map's keys.
const DICTIONARIES: Record<DictionaryKind, DictionaryConfig> = {
  products: {
    table: "products",
    column: "name",
    label: "Towary",
    normalize: (raw) => raw.trim(),
    validate: (value) =>
      value.length < 1 || value.length > 100 ? "Nazwa towaru musi mieć od 1 do 100 znaków." : null,
  },
  suppliers: {
    table: "suppliers",
    column: "name",
    label: "Dostawcy",
    normalize: (raw) => raw.trim(),
    validate: (value) =>
      value.length < 1 || value.length > 100 ? "Nazwa dostawcy musi mieć od 1 do 100 znaków." : null,
  },
  currencies: {
    table: "currencies",
    column: "code",
    label: "Waluty",
    normalize: (raw) => raw.trim().toUpperCase(),
    validate: (value) => (!/^[A-Z]{3}$/.test(value) ? "Kod waluty musi składać się z dokładnie 3 liter." : null),
  },
};

export function isDictionaryKind(value: string): value is DictionaryKind {
  return value === "products" || value === "suppliers" || value === "currencies";
}

export function dictionaryLabel(kind: DictionaryKind): string {
  return DICTIONARIES[kind].label;
}

export function listDictionaryEntries(kind: DictionaryKind): DictionaryEntry[] {
  const { table, column } = DICTIONARIES[kind];
  return db.prepare(`SELECT id, ${column} AS value FROM ${table} ORDER BY ${column}`).all() as DictionaryEntry[];
}

export type DictionaryResult = { ok: true } | { ok: false; error: string };

export function createDictionaryEntry(kind: DictionaryKind, raw: string): DictionaryResult {
  const config = DICTIONARIES[kind];
  const value = config.normalize(raw);
  const validationError = config.validate(value);
  if (validationError) return { ok: false, error: validationError };

  try {
    db.prepare(`INSERT INTO ${config.table} (${config.column}) VALUES (?)`).run(value);
    return { ok: true };
  } catch {
    return { ok: false, error: `Wartość „${value}” już istnieje.` };
  }
}

export function updateDictionaryEntry(kind: DictionaryKind, id: number, raw: string): DictionaryResult {
  const config = DICTIONARIES[kind];
  const value = config.normalize(raw);
  const validationError = config.validate(value);
  if (validationError) return { ok: false, error: validationError };

  try {
    const result = db.prepare(`UPDATE ${config.table} SET ${config.column} = ? WHERE id = ?`).run(value, id);
    if (result.changes === 0) return { ok: false, error: "Nie znaleziono pozycji do edycji." };
    return { ok: true };
  } catch {
    return { ok: false, error: `Wartość „${value}” już istnieje.` };
  }
}

// purchase_orders copies dictionary values in as plain text (see SQLite_Baza_Zamowien_Dokumentacja),
// so removing a dictionary entry never touches historical orders — it only drops it from future dropdowns.
export function deleteDictionaryEntry(kind: DictionaryKind, id: number): void {
  const { table } = DICTIONARIES[kind];
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}
