import type { ApiResponse } from "../../api_response";
import { FhirListParams } from "../../healthfacility/types";

import type { CatalogOptionDto, SearchPageDto } from "./types";

type ListPage<T> = { items: T[]; total: number; hasNext: boolean; hasPrevious: boolean };

/**
 * Walk catalog pages client-side filtering by `q` (the backend has no text search for
 * services/items). Throws `Error & {statusCode}` when the first page fails.
 */
export async function searchCatalogOptions<T>(options: {
  q: string;
  list: (params: FhirListParams) => Promise<ApiResponse<ListPage<T>>>;
  mapItem: (item: T) => CatalogOptionDto;
  createParams?: (pageOffset: number, count: number) => FhirListParams;
  pageSize?: number;
  maxPages?: number;
  maxMatches?: number;
}): Promise<SearchPageDto<CatalogOptionDto>> {
  const q = options.q.trim().toLowerCase();
  const pageSize = options.pageSize ?? 100;
  const maxPages = options.maxPages ?? (q ? 5 : 1);
  const maxMatches = options.maxMatches ?? 50;
  const createParams = options.createParams ?? ((p, c) => new FhirListParams(p, c));

  const matches: CatalogOptionDto[] = [];
  let total = 0;
  let hasNext = false;
  let hasPrevious = false;

  for (let page = 1; page <= maxPages; page++) {
    const resp = await options.list(createParams(page, pageSize));
    if (!resp.success || resp.data == null) {
      if (page === 1) {
        throw Object.assign(new Error(resp.message || "Catalog search failed"), {
          statusCode: Number(resp.statusCode) || 502,
        });
      }
      break;
    }

    const mapped = resp.data.items.map(options.mapItem);
    total = resp.data.total;
    hasNext = resp.data.hasNext;
    hasPrevious = page === 1 ? resp.data.hasPrevious : hasPrevious;

    if (!q) {
      return { total, items: mapped.slice(0, maxMatches), hasNext, hasPrevious };
    }

    for (const item of mapped) {
      const haystack = `${item.label} ${item.code ?? ""} ${item.value}`.toLowerCase();
      if (haystack.includes(q)) {
        matches.push(item);
        if (matches.length >= maxMatches) {
          return { total: matches.length, items: matches, hasNext: false, hasPrevious: false };
        }
      }
    }

    if (!resp.data.hasNext) break;
  }

  return {
    total: q ? matches.length : total,
    items: q ? matches : [],
    hasNext: q ? false : hasNext,
    hasPrevious: q ? false : hasPrevious,
  };
}

export * from "./catalog-options";
