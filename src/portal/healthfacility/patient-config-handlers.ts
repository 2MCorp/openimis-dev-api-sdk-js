import type OpenIMISDevApiSdk from "../../index";
import { toUserFacingApiError } from "../common/user_facing_error";
import { apiFail, apiOk, fromSdkResponse, sdkFail } from "../common/envelope";
import type { EnvelopeResult } from "../common/envelope";
import { serializePatient } from "./serialize";
import type { ClientConfigDto, HfSessionInfo, HfSessionUser, PatientDto } from "./types";
import type { SearchParamsLike } from "./request";

/** GET /api/patients/search — `identifier` (CHF id) required. */
export async function handlePatientSearch(
  sdk: OpenIMISDevApiSdk,
  params: SearchParamsLike,
  options: { apiBaseUrl: string }
): Promise<EnvelopeResult<PatientDto>> {
  const identifier = params.get("identifier")?.trim();
  if (!identifier) return apiFail(400, "Patient identifier is required.");
  const resp = await sdk.healthFacility.patients.getByChfId(identifier);
  return fromSdkResponse(
    resp,
    (p) => serializePatient(p, options.apiBaseUrl),
    "No patient found with that identifier."
  );
}

/** Used when `/client-config/` is unavailable (openIMIS defaults). */
export const DEFAULT_HF_CLIENT_CONFIG: ClientConfigDto = {
  claimForm: { fixedPricesAtEnter: false, fixedPricesAtReview: false },
  money: {
    currency: "NGN",
    currencyCode: "NGN",
    currencySymbol: "₦",
    currencySymbolPosition: "left",
    currencyDecimalPlaces: 2,
    currencyName: "Nigerian Naira",
  },
};

export function defaultClientConfig(): ClientConfigDto {
  return structuredClone(DEFAULT_HF_CLIENT_CONFIG);
}

/** Config for the UI: backend value, or defaults when the call fails/throws. Never throws. */
export async function loadClientConfig(sdk: OpenIMISDevApiSdk): Promise<ClientConfigDto> {
  try {
    const resp = await sdk.healthFacility.clientConfig.get();
    if (resp.success && resp.data) {
      return {
        claimForm: {
          fixedPricesAtEnter: Boolean(resp.data.claimForm?.fixedPricesAtEnter),
          fixedPricesAtReview: Boolean(resp.data.claimForm?.fixedPricesAtReview),
        },
        money: resp.data.money,
      };
    }
  } catch {
    // keep defaults
  }
  return defaultClientConfig();
}

/** GET /api/config — 5xx/network failures degrade to defaults, 4xx are reported. */
export async function handleClientConfig(sdk: OpenIMISDevApiSdk): Promise<EnvelopeResult<ClientConfigDto>> {
  try {
    const resp = await sdk.healthFacility.clientConfig.get();
    if (!resp.success || resp.data == null) return sdkFail(resp, 502);
    return apiOk({
      claimForm: {
        fixedPricesAtEnter: Boolean(resp.data.claimForm?.fixedPricesAtEnter),
        fixedPricesAtReview: Boolean(resp.data.claimForm?.fixedPricesAtReview),
      },
      money: resp.data.money,
    });
  } catch (e) {
    const status = Number((e as { statusCode?: number }).statusCode) || 502;
    if (status >= 500) return apiOk(defaultClientConfig());
    return apiFail(status, toUserFacingApiError(status, e instanceof Error ? e.message : undefined));
  }
}

/**
 * GET /api/session — only safe user fields (never the Knox token) plus client config.
 * The route must answer with `Cache-Control: no-store`; 401 when there is no session.
 */
export async function handleSessionInfo(
  sdk: OpenIMISDevApiSdk,
  session: { user: HfSessionUser; accessTokenExpires: number } | null | undefined
): Promise<EnvelopeResult<HfSessionInfo>> {
  if (!session) return apiFail(401, "Unauthorized");
  const clientConfig = await loadClientConfig(sdk);
  return apiOk({ user: session.user, clientConfig, expiresAt: session.accessTokenExpires });
}
