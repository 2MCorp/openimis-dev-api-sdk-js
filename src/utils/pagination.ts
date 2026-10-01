import { ApiResponse } from "../api_response";
import { FhirSearchPage } from "../models/pagination";

export type CollectAllOptions = {
  /** Page size requested from the backend (`_count`). Default 50. */
  pageSize?: number;
  /** Hard cap on pages fetched. Default 50 (2 500 rows at the default size). */
  maxPages?: number;
};

export type CollectedItems<T> = {
  items: T[];
  total: number;
  /** True when `maxPages` stopped the walk before the last page. */
  truncated: boolean;
};

/**
 * Walk every page of an OpenIMIS FHIR list (`page-offset` is 1-based) and
 * concatenate the items. The first failing page fails the whole call.
 */
export async function collectAllPages<T>(
  fetchPage: (pageOffset: number, pageSize: number) => Promise<ApiResponse<FhirSearchPage<T>>>,
  options: CollectAllOptions = {}
): Promise<ApiResponse<CollectedItems<T>>> {
  const pageSize = options.pageSize ?? 50;
  const maxPages = options.maxPages ?? 50;
  const items: T[] = [];
  let total = 0;

  for (let page = 1; page <= maxPages; page++) {
    const resp = await fetchPage(page, pageSize);
    if (!resp.success || !resp.data) {
      return ApiResponse.fail(resp.statusCode, resp.message, resp.errorDetails);
    }
    total = resp.data.total;
    items.push(...resp.data.items);
    if (!resp.data.hasNext || resp.data.items.length === 0) {
      return ApiResponse.ok({ items, total, truncated: false });
    }
  }
  return ApiResponse.ok({ items, total, truncated: true });
}
