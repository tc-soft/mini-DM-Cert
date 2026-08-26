// Trims a URL search param and normalizes blank input to null, so downstream
// SQL can treat "no filter" as NULL instead of an empty-string comparison.
export function queryParam(url: URL, name: string): string | null {
  const value = url.searchParams.get(name)?.trim() ?? "";
  return value.length === 0 ? null : value;
}
