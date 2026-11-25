import type { CatalogOptionDto, SearchPageDto } from "./types";

/** Option shape shared with the UI's async select. */
export type CatalogSelectOption = { value: string; label: string; unitPrice?: number };

export function catalogOptionToSelect(item: CatalogOptionDto): CatalogSelectOption {
  return { value: item.code || item.value, label: item.label, unitPrice: item.unitPrice };
}

/** Format catalog unit price for claim/encounter line inputs. */
export function unitPriceFromSelectOption(opt: CatalogSelectOption | null): string {
  if (opt == null || opt.unitPrice == null) return "";
  const n = Number(opt.unitPrice);
  if (!Number.isFinite(n)) return "";
  return String(n);
}

export type CatalogPriceKind = "service" | "item";

/**
 * Resolve unit price for a selected catalog option. Uses the option payload when present;
 * otherwise re-queries the catalog API through the injected `fetchJson` (the app's api client).
 */
export async function resolveCatalogUnitPrice(
  kind: CatalogPriceKind,
  opt: CatalogSelectOption | null,
  fetchJson: <T>(url: string) => Promise<T>
): Promise<string> {
  if (!opt?.value) return "";

  const fromOpt = unitPriceFromSelectOption(opt);
  if (fromOpt) return fromOpt;

  const path = kind === "service" ? "/api/catalog/services" : "/api/catalog/items";
  const page = await fetchJson<SearchPageDto<CatalogOptionDto>>(
    `${path}?q=${encodeURIComponent(opt.value)}`
  );
  const match = page.items.find((item) => (item.code || item.value) === opt.value) ?? page.items[0];
  return match ? unitPriceFromSelectOption(catalogOptionToSelect(match)) : "";
}

/** `price` as a finite number, else undefined (catalog prices may arrive as strings). */
export function parseCatalogPrice(raw: number | string | undefined | null): number | undefined {
  const parsed = raw === undefined || raw === null || raw === "" ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Option for a service / medication row: `CODE — Name`, falling back to code or id. */
export function catalogCodeNameOption(row: {
  uuid?: string;
  id?: string;
  code?: string;
  name?: string;
  unitPrice?: number | string | null;
}): CatalogOptionDto {
  const value = String(row.uuid || row.id || row.code);
  const label = row.name ? `${row.code ? `${row.code} — ` : ""}${row.name}` : row.code || value;
  return { value, label, code: row.code, unitPrice: parseCatalogPrice(row.unitPrice) };
}
