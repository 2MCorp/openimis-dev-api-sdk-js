import type OpenIMISDevApiSdk from "../../index";
import { DashboardQueryParams } from "../../dashboard/types";
import type {
  HealthFacilityAnalyticsResponse,
  HealthFacilityMetricResponse,
} from "../../dashboard/models";
import { toUserFacingApiError } from "../common/user_facing_error";
import { apiOk, type EnvelopeResult } from "../common/envelope";
import type { SearchParamsLike } from "./request";
import type {
  AnalyticsSeriesPoint,
  DashboardAnalyticsView,
  DashboardApiPayload,
  DashboardGranularity,
  DashboardMetricsView,
  DashboardQueryView,
  PeriodPoint,
  RecentItem,
  StatusCounts,
  TimeSeriesBlock,
} from "./dashboard-types";

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function mapStatusCounts(raw: Record<string, unknown>): StatusCounts {
  return {
    total: num(raw.total),
    rejected: num(raw.rejected),
    entered: num(raw.entered),
    checked: num(raw.checked),
    valuated: num(raw.valuated),
    approved: num(raw.approved),
    unique_patients: num(raw.unique_patients),
    average_approved_amount: num(raw.average_approved_amount)
  };
}

function mapPeriodPoint(raw: unknown): PeriodPoint | null {
  const row = asRecord(raw);
  const period = str(row.period);
  if (!period) return null;
  return {
    period,
    total: num(row.total),
    rejected: num(row.rejected),
    entered: num(row.entered),
    checked: num(row.checked),
    valuated: num(row.valuated),
    approved_count: num(row.approved_count),
    unique_patients: num(row.unique_patients),
    total_claimed: num(row.total_claimed),
    total_approved: num(row.total_approved)
  };
}

function mapTimeSeries(raw: unknown, granularity: string): TimeSeriesBlock {
  const block = asRecord(raw);
  const g = str(block.granularity) ?? granularity;
  const claimsKey = `claims_by_${g}`;
  const encountersKey = `encounters_by_${g}`;
  const combinedKey = `combined_by_${g}`;

  const mapList = (value: unknown): PeriodPoint[] =>
    Array.isArray(value)
      ? value.map(mapPeriodPoint).filter((p): p is PeriodPoint => p != null)
      : [];

  // Backend returns an object; older fixture/SDK samples used a flat array.
  if (Array.isArray(raw)) {
    return {
      granularity: g,
      claims: mapList(raw),
      encounters: [],
      combined: mapList(raw)
    };
  }

  return {
    granularity: g,
    claims: mapList(block[claimsKey]),
    encounters: mapList(block[encountersKey]),
    combined: mapList(block[combinedKey])
  };
}

function mapRecentClaim(raw: unknown): RecentItem | null {
  const row = asRecord(raw);
  if (row.id == null) return null;
  return {
    id: row.id as number | string,
    uuid: str(row.uuid),
    code: str(row.code),
    status: str(row.status) ?? "unknown",
    date: str(row.date_claimed) ?? null,
    patient_name: str(row.patient_name) ?? null,
    patient_chf_id: str(row.patient_chf_id) ?? null,
    claimed: typeof row.claimed === "number" ? row.claimed : null
  };
}

function mapRecentPreauth(raw: unknown): RecentItem | null {
  const row = asRecord(raw);
  if (row.id == null) return null;
  return {
    id: row.id as number | string,
    uuid: str(row.uuid),
    status: str(row.status) ?? "unknown",
    date: str(row.date) ?? null,
    patient_name: str(row.patient_name) ?? null,
    patient_chf_id: str(row.patient_chf_id) ?? null,
    service_name: str(row.service_name) ?? null,
    item_name: str(row.item_name) ?? null
  };
}

function numberMap(raw: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "number") out[key] = value;
  }
  return out;
}

export function serializeMetrics(
  metrics: HealthFacilityMetricResponse
): DashboardMetricsView {
  const raw = metrics.raw;
  const granularity = metrics.filterApplied.granularity ?? "month";
  const recent = asRecord(raw.recent ?? metrics.recent);

  return {
    filterApplied: {
      dateFrom: metrics.filterApplied.dateFrom,
      dateTo: metrics.filterApplied.dateTo,
      months: metrics.filterApplied.months,
      granularity: metrics.filterApplied.granularity
    },
    claims: mapStatusCounts(metrics.claims),
    encounters: mapStatusCounts(metrics.encounters),
    preauthorizations: numberMap(metrics.preauthorizations),
    timeSeries: mapTimeSeries(raw.time_series ?? metrics.timeSeries, granularity),
    lifetimeTotals: numberMap(asRecord(raw.lifetime_totals ?? metrics.lifetimeTotals)),
    openQueues: numberMap(asRecord(raw.open_queues ?? metrics.openQueues)),
    today: numberMap(asRecord(raw.today ?? metrics.today)),
    claimsValueMtd: asRecord(raw.claims_value_mtd ?? metrics.claimsValueMtd) as Record<
      string,
      number | string
    >,
    recent: {
      claims: (Array.isArray(recent.claims) ? recent.claims : [])
        .map(mapRecentClaim)
        .filter((x): x is RecentItem => x != null),
      encounters: (Array.isArray(recent.encounters) ? recent.encounters : [])
        .map(mapRecentClaim)
        .filter((x): x is RecentItem => x != null),
      preauthorizations: (Array.isArray(recent.preauthorizations)
        ? recent.preauthorizations
        : []
      )
        .map(mapRecentPreauth)
        .filter((x): x is RecentItem => x != null)
    }
  };
}

function mapAnalyticsSeries(raw: unknown): AnalyticsSeriesPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = asRecord(item);
      const period = str(row.period);
      if (!period) return null;
      return {
        period,
        value: num(row.value),
        rejected: num(row.rejected),
        rejection_rate: num(row.rejection_rate),
        total_claimed: num(row.total_claimed),
        total_approved: num(row.total_approved)
      };
    })
    .filter((x): x is AnalyticsSeriesPoint => x != null);
}

function mapAmountLeakage(raw: Record<string, unknown>) {
  return {
    total_claimed: num(raw.total_claimed),
    total_approved: num(raw.total_approved),
    total_valuated: num(raw.total_valuated),
    total_remunerated: num(raw.total_remunerated),
    approval_ratio: num(raw.approval_ratio),
    remuneration_ratio: num(raw.remuneration_ratio),
    leakage_amount: num(raw.leakage_amount)
  };
}

function mapReferrals(raw: Record<string, unknown>) {
  const destinations = Array.isArray(raw.destinations)
    ? raw.destinations.map((item) => {
        const row = asRecord(item);
        return {
          health_facility_id:
            typeof row.health_facility_id === "number"
              ? row.health_facility_id
              : undefined,
          health_facility_name: str(row.health_facility_name),
          health_facility_code: str(row.health_facility_code),
          total: num(row.total),
          approved: num(row.approved),
          rejected: num(row.rejected),
          approval_rate: num(row.approval_rate)
        };
      })
    : [];

  return {
    total: num(raw.total),
    approved: num(raw.approved),
    rejected: num(raw.rejected),
    approval_rate: num(raw.approval_rate),
    destinations
  };
}

function mapSeasonality(raw: Record<string, unknown>) {
  const byDay = asRecord(raw.by_day_of_week);
  const byHourRaw = asRecord(raw.by_hour);
  const by_day_of_week: Record<string, number> = {};
  for (const [key, value] of Object.entries(byDay)) {
    if (typeof value === "number") by_day_of_week[key] = value;
  }
  const by_hour: Record<number, number> = {};
  for (const [key, value] of Object.entries(byHourRaw)) {
    const hour = Number(key);
    if (Number.isFinite(hour) && typeof value === "number") by_hour[hour] = value;
  }
  return { by_day_of_week, by_hour };
}

export function serializeAnalytics(
  analytics: HealthFacilityAnalyticsResponse
): DashboardAnalyticsView {
  const raw = analytics.raw;
  return {
    filterApplied: {
      dateFrom: analytics.filterApplied.dateFrom,
      dateTo: analytics.filterApplied.dateTo,
      months: analytics.filterApplied.months,
      granularity: analytics.filterApplied.granularity,
      slaHours: analytics.filterApplied.slaHours
    },
    comparisons: {
      current: analytics.comparisons.current,
      previous: analytics.comparisons.previous,
      deltaPct: analytics.comparisons.deltaPct
    },
    series: mapAnalyticsSeries(analytics.series),
    insights: analytics.insights.map((i) => ({
      type: i.type,
      code: i.code,
      message: i.message
    })),
    rates: numberMap(analytics.rates),
    sla: numberMap(analytics.sla),
    amountLeakage: mapAmountLeakage(
      asRecord(raw.amount_leakage ?? analytics.amountLeakage)
    ),
    referrals: mapReferrals(asRecord(raw.referrals ?? analytics.referrals)),
    seasonality: mapSeasonality(asRecord(raw.seasonality ?? analytics.seasonality))
  };
}

import { parseDashboardQuery } from "./dashboard-query";
export { parseDashboardGranularity, parseDashboardQuery, emptyDashboardPayload } from "./dashboard-query";

export async function loadHealthFacilityDashboard(
  sdk: OpenIMISDevApiSdk,
  options: DashboardQueryView
): Promise<Omit<DashboardApiPayload, "query">> {
  const params = new DashboardQueryParams(
    options.months,
    options.granularity,
    undefined,
    undefined,
    undefined,
    5
  );

  const [metricsResp, analyticsResp] = await Promise.all([
    sdk.dashboard.metrics.healthFacility(params),
    sdk.dashboard.analytics.healthFacility(params),
  ]);

  return {
    metrics: metricsResp.success && metricsResp.data ? serializeMetrics(metricsResp.data) : null,
    metricsError: metricsResp.success
      ? null
      : toUserFacingApiError(metricsResp.statusCode, metricsResp.message),
    analytics:
      analyticsResp.success && analyticsResp.data
        ? serializeAnalytics(analyticsResp.data)
        : null,
    analyticsError: analyticsResp.success
      ? null
      : toUserFacingApiError(analyticsResp.statusCode, analyticsResp.message),
  };
}

/** GET /api/dashboard */
export async function handleDashboard(
  sdk: OpenIMISDevApiSdk,
  params: SearchParamsLike
): Promise<EnvelopeResult<DashboardApiPayload>> {
  const query = parseDashboardQuery(params);
  const dashboard = await loadHealthFacilityDashboard(sdk, query);
  return apiOk({ ...dashboard, query });
}
