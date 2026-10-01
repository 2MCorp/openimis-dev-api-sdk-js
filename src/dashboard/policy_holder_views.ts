import type { PolicyHolderAnalyticsResponse, PolicyHolderMetricResponse } from "./models";
import { DashboardGranularity, DashboardQueryParams } from "./types";

/**
 * Typed views over `GET /dashboard/metric|analytics/policy-holder/`
 * (developer_api_dashboards/views/{metric,analytics}/policy_holder.py).
 */

export type ClaimsPeriod = {
  period: string;
  total: number;
  rejected: number;
  entered: number;
  checked: number;
  valuated: number;
  approvedCount: number;
  uniquePatients: number;
  totalClaimed: number;
  totalApproved: number;
};

/** Count + money per period (premiums by pay_date, payments by received date). */
export type AmountPeriod = { period: string; count: number; amount: number };

export type ContractPeriod = {
  period: string;
  total: number;
  effective: number;
  executed: number;
  draft: number;
};

export type PlanEnrollment = {
  planId: string;
  bundleId?: string;
  name?: string;
  code?: string;
  enrolleeCount: number;
};

export type PolicyHolderMetricsSummary = {
  filterApplied: {
    dateFrom?: string;
    dateTo?: string;
    months?: number;
    granularity?: string;
    expiringDays?: number;
  };
  employees: {
    totalActive: number;
    withPolicy: number;
    withoutPolicy: number;
    /** 0–100 */
    coveragePercentage: number;
    periodNew: number;
    /** % vs prior period; null when there is no prior baseline. */
    growthRate: number | null;
  };
  contracts: {
    total: number;
    active: number;
    draft: number;
    expiringSoon: number;
    periodCreated: number;
    /** All 11 contract states keyed by label (`request_for_information`, `draft`, …). */
    byState: Record<string, number>;
    periods: ContractPeriod[];
  };
  insurancePlans: {
    totalActive: number;
    subscribed: number;
    /** 0–100 */
    coverageRate: number;
    byPlan: PlanEnrollment[];
  };
  contributions: { premiumCount: number; totalAmount: number; periods: AmountPeriod[] };
  payments: {
    total: number;
    totalReceived: number;
    expectedAmount: number;
    /** Expected − received over payments not yet matched (≥ 0). */
    pendingAmount: number;
    withReceipt: number;
    withoutReceipt: number;
    byStatus: Record<string, number>;
    periods: AmountPeriod[];
  };
  claims: {
    total: number;
    rejected: number;
    entered: number;
    checked: number;
    valuated: number;
    approved: number;
    uniquePatients: number;
    totalClaimed: number;
    totalApproved: number;
    avgClaimed: number;
    avgApproved: number;
    periods: ClaimsPeriod[];
  };
};

export type EnrollmentPeriod = { period: string; new: number; churned: number; net: number };

export type ClaimsSeriesPeriod = {
  period: string;
  claims: number;
  rejected: number;
  /** 0–1 */
  rejectionRate: number;
  totalClaimed: number;
  totalApproved: number;
  /** 0–1 */
  approvalRatio: number;
};

/** Current-period snapshot used for prior-period comparisons. */
export type PolicyHolderSnapshot = {
  employeesNew: number;
  employeesChurned: number;
  contractsCreated: number;
  claimsTotal: number;
  claimsRejected: number;
  /** 0–1 */
  rejectionRate: number;
  claimsApprovedAmount: number;
  claimsClaimedAmount: number;
  premiumAmount: number;
};

export type PolicyHolderAnalyticsSummary = {
  filterApplied: {
    dateFrom?: string;
    dateTo?: string;
    months?: number;
    granularity?: string;
    priorDateFrom?: string;
    priorDateTo?: string;
  };
  current: PolicyHolderSnapshot;
  previous: PolicyHolderSnapshot;
  /** % change per snapshot key; null when the prior value was 0. */
  deltaPct: Partial<Record<keyof PolicyHolderSnapshot, number | null>>;
  series: ClaimsSeriesPeriod[];
  insights: { type: string; code: string; message: string }[];
  paymentGap: {
    premiumAmount: number;
    receivedAmount: number;
    gapAmount: number;
    /** 0–1 */
    collectionRate: number;
  };
  enrollment: { activeEmployees: number; series: EnrollmentPeriod[] };
  contractFunnel: { stage: string; count: number }[];
  costDrivers: {
    byHealthFacility: {
      id?: number;
      name?: string;
      code?: string;
      total: number;
      totalApproved: number;
      totalClaimed: number;
    }[];
    byVisitType: { visitType: string; total: number; totalApproved: number }[];
  };
};

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(rec) : [];
}

function periodRows(value: unknown): Record<string, unknown>[] {
  return rows(value).filter((row) => str(row.period));
}

function numberMap(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, v] of Object.entries(rec(value))) {
    if (typeof v === "number") out[key] = v;
  }
  return out;
}

function amountPeriods(value: unknown, countKey: string, amountKey: string): AmountPeriod[] {
  return periodRows(value).map((row) => ({
    period: String(row.period),
    count: num(row[countKey]),
    amount: num(row[amountKey]),
  }));
}

export function summarizePolicyHolderMetrics(
  metrics: PolicyHolderMetricResponse
): PolicyHolderMetricsSummary {
  const e = metrics.employees;
  const c = metrics.contracts;
  const p = metrics.insurancePlans;
  const contrib = metrics.contributions;
  const pay = metrics.payments;
  const cl = metrics.claimsSummary;
  const amounts = rec(cl.amount_metrics);

  return {
    filterApplied: {
      dateFrom: metrics.filterApplied.dateFrom,
      dateTo: metrics.filterApplied.dateTo,
      months: metrics.filterApplied.months,
      granularity: metrics.filterApplied.granularity,
      expiringDays: metrics.filterApplied.expiringDays,
    },
    employees: {
      totalActive: num(e.total_active),
      withPolicy: num(e.with_policy),
      withoutPolicy: num(e.without_policy),
      coveragePercentage: num(e.coverage_percentage),
      periodNew: num(e.period_new),
      growthRate: typeof e.growth_rate === "number" ? e.growth_rate : null,
    },
    contracts: {
      total: num(c.total),
      active: num(c.active),
      draft: num(c.draft),
      expiringSoon: num(c.expiring_soon),
      periodCreated: num(c.period_created),
      byState: numberMap(c.by_state),
      periods: periodRows(c.period_breakdown).map((row) => ({
        period: String(row.period),
        total: num(row.total),
        effective: num(row.effective),
        executed: num(row.executed),
        draft: num(row.draft),
      })),
    },
    insurancePlans: {
      totalActive: num(p.total_active),
      subscribed: num(p.subscribed),
      coverageRate: num(p.coverage_rate),
      byPlan: rows(p.by_plan).map((row) => ({
        planId: String(row.plan_id ?? ""),
        bundleId: str(row.bundle_id),
        name: str(row.name),
        code: str(row.code),
        enrolleeCount: num(row.enrollee_count),
      })),
    },
    contributions: {
      premiumCount: num(contrib.premium_count),
      totalAmount: num(contrib.total_amount),
      periods: amountPeriods(contrib.period_breakdown, "premium_count", "total_amount"),
    },
    payments: {
      total: num(pay.total),
      totalReceived: num(pay.total_received),
      expectedAmount: num(pay.expected_amount),
      pendingAmount: num(pay.pending_amount),
      withReceipt: num(pay.with_receipt),
      withoutReceipt: num(pay.without_receipt),
      byStatus: numberMap(pay.by_status),
      periods: amountPeriods(pay.period_breakdown, "total", "total_received"),
    },
    claims: {
      total: num(cl.total),
      rejected: num(cl.rejected),
      entered: num(cl.entered),
      checked: num(cl.checked),
      valuated: num(cl.valuated),
      approved: num(cl.approved),
      uniquePatients: num(cl.unique_patients),
      totalClaimed: num(amounts.total_claimed),
      totalApproved: num(amounts.total_approved),
      avgClaimed: num(amounts.avg_claimed),
      avgApproved: num(amounts.avg_approved),
      periods: periodRows(cl.period_breakdown).map((row) => ({
        period: String(row.period),
        total: num(row.total),
        rejected: num(row.rejected),
        entered: num(row.entered),
        checked: num(row.checked),
        valuated: num(row.valuated),
        approvedCount: num(row.approved_count),
        uniquePatients: num(row.unique_patients),
        totalClaimed: num(row.total_claimed),
        totalApproved: num(row.total_approved),
      })),
    },
  };
}

function snapshot(value: unknown): PolicyHolderSnapshot {
  const s = rec(value);
  return {
    employeesNew: num(s.employees_new),
    employeesChurned: num(s.employees_churned),
    contractsCreated: num(s.contracts_created),
    claimsTotal: num(s.claims_total),
    claimsRejected: num(s.claims_rejected),
    rejectionRate: num(s.rejection_rate),
    claimsApprovedAmount: num(s.claims_approved_amount),
    claimsClaimedAmount: num(s.claims_claimed_amount),
    premiumAmount: num(s.premium_amount),
  };
}

const SNAPSHOT_KEYS: Record<string, keyof PolicyHolderSnapshot> = {
  employees_new: "employeesNew",
  employees_churned: "employeesChurned",
  contracts_created: "contractsCreated",
  claims_total: "claimsTotal",
  claims_rejected: "claimsRejected",
  rejection_rate: "rejectionRate",
  claims_approved_amount: "claimsApprovedAmount",
  claims_claimed_amount: "claimsClaimedAmount",
  premium_amount: "premiumAmount",
};

export function summarizePolicyHolderAnalytics(
  analytics: PolicyHolderAnalyticsResponse
): PolicyHolderAnalyticsSummary {
  const gap = analytics.paymentGap;
  const enrollment = analytics.enrollmentVelocity;
  const drivers = analytics.costDrivers;
  const deltaPct: PolicyHolderAnalyticsSummary["deltaPct"] = {};
  for (const [key, value] of Object.entries(analytics.comparisons.deltaPct)) {
    const mapped = SNAPSHOT_KEYS[key];
    if (mapped) deltaPct[mapped] = typeof value === "number" ? value : null;
  }

  return {
    filterApplied: {
      dateFrom: analytics.filterApplied.dateFrom,
      dateTo: analytics.filterApplied.dateTo,
      months: analytics.filterApplied.months,
      granularity: analytics.filterApplied.granularity,
      priorDateFrom: analytics.filterApplied.priorDateFrom,
      priorDateTo: analytics.filterApplied.priorDateTo,
    },
    current: snapshot(analytics.comparisons.current),
    previous: snapshot(analytics.comparisons.previous),
    deltaPct,
    series: periodRows(analytics.series).map((row) => ({
      period: String(row.period),
      claims: num(row.value),
      rejected: num(row.rejected),
      rejectionRate: num(row.rejection_rate),
      totalClaimed: num(row.total_claimed),
      totalApproved: num(row.total_approved),
      approvalRatio: num(row.approval_ratio),
    })),
    insights: analytics.insights.map((i) => ({ type: i.type, code: i.code, message: i.message })),
    paymentGap: {
      premiumAmount: num(gap.premium_amount),
      receivedAmount: num(gap.received_amount),
      gapAmount: num(gap.gap_amount),
      collectionRate: num(gap.collection_rate),
    },
    enrollment: {
      activeEmployees: num(enrollment.active_employees),
      series: periodRows(enrollment.series).map((row) => ({
        period: String(row.period),
        new: num(row.new),
        churned: num(row.churned),
        net: num(row.net),
      })),
    },
    contractFunnel: rows(rec(analytics.contractFunnel).stages).map((row) => ({
      stage: String(row.stage ?? ""),
      count: num(row.count),
    })),
    costDrivers: {
      byHealthFacility: rows(drivers.by_health_facility).map((row) => ({
        id: typeof row.health_facility_id === "number" ? row.health_facility_id : undefined,
        name: str(row.health_facility_name),
        code: str(row.health_facility_code),
        total: num(row.total),
        totalApproved: num(row.total_approved),
        totalClaimed: num(row.total_claimed),
      })),
      byVisitType: rows(drivers.by_visit_type).map((row) => ({
        visitType: String(row.visit_type ?? ""),
        total: num(row.total),
        totalApproved: num(row.total_approved),
      })),
    },
  };
}

/** Backend enforces `months >= 2` (smaller values are raised) — mirror it client-side. */
export const DASHBOARD_MIN_MONTHS = 2;
export const DASHBOARD_MAX_MONTHS = 24;
export const DASHBOARD_DEFAULT_MONTHS = 6;
/** Default `expiring_days` for the policy-holder metric view. */
export const DASHBOARD_DEFAULT_EXPIRING_DAYS = 60;

/** Clamp untrusted input (e.g. URL query) to what the dashboard endpoints accept. */
export function normalizeDashboardQuery(input: {
  months?: unknown;
  granularity?: unknown;
}): { months: number; granularity: DashboardGranularity } {
  const raw = Number(input.months ?? DASHBOARD_DEFAULT_MONTHS);
  const months = Number.isFinite(raw)
    ? Math.min(Math.max(Math.floor(raw), DASHBOARD_MIN_MONTHS), DASHBOARD_MAX_MONTHS)
    : DASHBOARD_DEFAULT_MONTHS;
  const granularity: DashboardGranularity =
    input.granularity === "week" || input.granularity === "day" ? input.granularity : "month";
  return { months, granularity };
}

export function policyHolderDashboardParams(query: {
  months?: unknown;
  granularity?: unknown;
}): DashboardQueryParams {
  const { months, granularity } = normalizeDashboardQuery(query);
  return new DashboardQueryParams(
    months,
    granularity,
    undefined,
    undefined,
    DASHBOARD_DEFAULT_EXPIRING_DAYS
  );
}
