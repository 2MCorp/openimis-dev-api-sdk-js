import OpenIMISDevApiSdk from "../../index";
import HttpClient from "../../types";

/**
 * Fresh SDK instance per call — the token comes from the sealed session, not a singleton.
 * `policyHolderCode` is required by the backend for users linked to several employers.
 */
export function createSdk(
  baseUrl: string,
  accessToken?: string,
  policyHolderCode?: string,
): OpenIMISDevApiSdk {
  const http = new HttpClient(
    baseUrl,
    accessToken ? { token: accessToken, authScheme: "Token", policyHolderCode } : {},
  );
  return new OpenIMISDevApiSdk(http);
}
