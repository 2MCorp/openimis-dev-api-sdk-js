import type { SearchParamsLike } from "./request";
import type { DashboardApiPayload, DashboardGranularity, DashboardQueryView } from "./dashboard-types";

export function parseDashboardGranularity(value: string | null): DashboardGranularity {
  if (value === "week" || value === "day" || value === "month") return value;
  return "month";
}

/** `?months=` (1..24, default 6) and `?granularity=` (month|week|day, default month). */
export function parseDashboardQuery(params: SearchParamsLike): DashboardQueryView {
  const monthsRaw = Number(params.get("months") ?? "6");
  const months = Number.isFinite(monthsRaw) && monthsRaw > 0 ? Math.min(monthsRaw, 24) : 6;
  return { months, granularity: parseDashboardGranularity(params.get("granularity")) };
}

/** Payload used when the dashboard cannot be loaded (SSR fallback / offline first paint). */
export function emptyDashboardPayload(query: DashboardQueryView): DashboardApiPayload {
  return { metrics: null, metricsError: null, analytics: null, analyticsError: null, query };
}
