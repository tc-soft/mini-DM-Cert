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
  // pl-PL's CLDR data sets minimumGroupingDigits: 2, so without `useGrouping: "always"` a
  // 4-digit value like 1250 renders as "1250,00" (no separator) while 10000 renders grouped —
  // `useGrouping: "always"` forces the thousands separator consistently at every magnitude.
  return (scaled / SCALE).toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
    useGrouping: "always",
  });
}

// Plain decimal string (no locale grouping) suitable for prefilling a number input on edit.
export function moneyToInputValue(scaled: number): string {
  return Number((scaled / SCALE).toFixed(4)).toString();
}
