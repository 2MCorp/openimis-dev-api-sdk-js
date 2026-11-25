import { describe, expect, it } from "vitest";
import { paginationItems, totalPageCount } from "../../src/portal/common/pagination";

describe("paginationItems", () => {
  it("lists all pages when few", () => {
    expect(paginationItems(1, 30, 10).map((i) => i.key)).toEqual(["page-1", "page-2", "page-3"]);
    expect(totalPageCount(0, 10)).toBe(1);
  });
  it("adds ellipses for many pages", () => {
    const keys = paginationItems(10, 200, 10).map((i) => i.key);
    expect(keys).toEqual(["page-1", "ellipsis-start", "page-9", "page-10", "page-11", "ellipsis-end", "page-20"]);
    expect(paginationItems(1, 200, 10).map((i) => i.key)).toEqual(["page-1", "page-2", "ellipsis-end", "page-20"]);
  });
});
