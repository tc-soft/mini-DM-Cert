const SCALE = 10000;

// Accepts "." or "," as the decimal separator (matches the doc's Polish-comma UI convention).
export function parseMoneyToInt(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * SCALE);
}

export function formatMoney(scaled: number): string {
  return (scaled / SCALE).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}
