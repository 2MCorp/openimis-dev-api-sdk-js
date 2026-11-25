/**
 * OpenIMIS Developer API root from the public base URL
 * (`PUBLIC_BASE_API_URL` / `NEXT_PUBLIC_BASE_API_URL`); appends `/developer_api` when missing.
 */
export function getDeveloperApiBase(publicBaseApiUrl: string): string {
  const base = publicBaseApiUrl.replace(/\/$/, "");
  return base.endsWith("/developer_api") ? base : `${base}/developer_api`;
}

/**
 * Online contract payments are off until `ONLINE_PAYMENTS=true`, so the button and
 * routes stay hidden in environments without a configured payment provider.
 */
export function onlinePaymentsEnabled(value: string | undefined | null): boolean {
  return value === "true";
}
