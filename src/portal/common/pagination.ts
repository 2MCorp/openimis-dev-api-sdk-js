export type PaginationItem =
  | { type: "page"; value: number; key: string }
  | { type: "ellipsis"; key: string };

export function totalPageCount(total: number, perPage: number): number {
  return perPage > 0 ? Math.max(1, Math.ceil(total / perPage)) : 1;
}

/**
 * Page buttons for a pager: first, last, `siblings` around the current page and ellipses
 * between gaps (all pages when there are at most `2 * siblings + 5`).
 */
export function paginationItems(
  currentPage: number,
  total: number,
  perPage: number,
  siblings = 1,
): PaginationItem[] {
  const pages = totalPageCount(total, perPage);
  const current = Math.min(Math.max(1, currentPage), pages);
  const page = (value: number): PaginationItem => ({ type: "page", value, key: `page-${value}` });
  if (pages <= siblings * 2 + 5) return Array.from({ length: pages }, (_, i) => page(i + 1));

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, pages);
  const items: PaginationItem[] = [page(1)];
  if (left > 2) items.push({ type: "ellipsis", key: "ellipsis-start" });
  for (let p = Math.max(left, 2); p <= Math.min(right, pages - 1); p++) items.push(page(p));
  if (right < pages - 1) items.push({ type: "ellipsis", key: "ellipsis-end" });
  items.push(page(pages));
  return items;
}

/** Rows-per-page choices of the list pagination bars. */
export const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;
