import type OpenIMISDevApiSdk from "../../index";
import { FhirListParams } from "../../healthfacility/types";
import { apiFail, apiOk, fromSdkResponse, parseFhirPageOffset, parsePositiveInt } from "../common/envelope";
import { toUserFacingApiError } from "../common/user_facing_error";
import { catalogCodeNameOption, searchCatalogOptions } from "./catalog";
import type { SearchParamsLike } from "./request";
import type { CatalogOptionDto, SearchPageDto } from "./types";

/** GET /api/catalog/diagnoses — `q`, `page-offset`, `_count` (default 30, max 100) */
export async function handleCatalogDiagnoses(sdk: OpenIMISDevApiSdk, params: SearchParamsLike) {
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const listParams = new FhirListParams(
    parseFhirPageOffset(params.get("page-offset")),
    parsePositiveInt(params.get("_count"), 30, 100)
  );
  const resp = await sdk.healthFacility.diagnoses.list(listParams);

  return fromSdkResponse(resp, (page): SearchPageDto<CatalogOptionDto> => {
    let items = page.items.map((d) => ({
      value: String(d.id ?? d.code),
      label: d.name || `${d.code}${d.name ? ` — ${d.name}` : ""}`,
      code: d.code,
    }));
    if (q) {
      items = items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.code?.toLowerCase().includes(q) ||
          item.value.toLowerCase().includes(q)
      );
    }
    return {
      total: q ? items.length : page.total,
      items,
      hasNext: q ? false : page.hasNext,
      hasPrevious: q ? false : page.hasPrevious,
    };
  });
}

/** GET /api/catalog/facilities — `hf_name` (or `q`) required; `_count` default 20, max 50 */
export async function handleCatalogFacilities(sdk: OpenIMISDevApiSdk, params: SearchParamsLike) {
  const hfName = (params.get("hf_name") ?? params.get("q") ?? "").trim();
  if (!hfName) return apiFail(400, "Provide hf_name (or q) to search facilities.");

  const listParams = new FhirListParams(undefined, parsePositiveInt(params.get("_count"), 20, 50));
  const resp = await sdk.healthFacility.facilities.searchByName(hfName, listParams);

  return fromSdkResponse(
    resp,
    (page): SearchPageDto<CatalogOptionDto> => ({
      total: page.total,
      items: page.items.map((hf) => ({
        value: String(hf.uuid || hf.id),
        label: `${hf.code ? `${hf.code} — ` : ""}${hf.name}`,
        code: hf.code,
      })),
      hasNext: page.hasNext,
      hasPrevious: page.hasPrevious,
    })
  );
}

async function searchPricedCatalog(
  q: string,
  list: Parameters<typeof searchCatalogOptions<{ uuid?: string; id?: string; code?: string; name?: string; unitPrice?: number }>>[0]["list"]
) {
  try {
    const page = await searchCatalogOptions({ q, list, mapItem: catalogCodeNameOption });
    return apiOk(page);
  } catch (e) {
    const status = Number((e as { statusCode?: number }).statusCode) || 502;
    return apiFail(status, toUserFacingApiError(status, e instanceof Error ? e.message : undefined));
  }
}

/** GET /api/catalog/services — `q` */
export function handleCatalogServices(sdk: OpenIMISDevApiSdk, params: SearchParamsLike) {
  return searchPricedCatalog((params.get("q") ?? "").trim(), (p) => sdk.healthFacility.services.list(p));
}

/** GET /api/catalog/items — `q` */
export function handleCatalogItems(sdk: OpenIMISDevApiSdk, params: SearchParamsLike) {
  return searchPricedCatalog((params.get("q") ?? "").trim(), (p) => sdk.healthFacility.medications.list(p));
}
