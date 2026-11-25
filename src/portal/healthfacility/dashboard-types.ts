export type DashboardGranularity = "month" | "week" | "day";

export type PeriodPoint = {
  period: string;
  total: number;
  rejected: number;
  entered: number;
  checked: number;
  valuated: number;
  approved_count: number;
  unique_patients: number;
  total_claimed: number;
  total_approved: number;
};

export type TimeSeriesBlock = {
  granularity: string;
  claims: PeriodPoint[];
  encounters: PeriodPoint[];
  combined: PeriodPoint[];
};

export type StatusCounts = {
  total: number;
  rejected: number;
  entered: number;
  checked: number;
  valuated: number;
  approved: number;
  unique_patients: number;
  average_approved_amount: number;
};

export type RecentItem = {
  id: number | string;
  uuid?: string;
  code?: string;
  status: string;
  date: string | null;
  patient_name: string | null;
  patient_chf_id: string | null;
  claimed?: number | null;
  service_name?: string | null;
  item_name?: string | null;
};

export type DashboardMetricsView = {
  filterApplied: { dateFrom?: string; dateTo?: string; months?: number; granularity?: string };
  claims: StatusCounts;
  encounters: StatusCounts;
  preauthorizations: Record<string, number>;
  timeSeries: TimeSeriesBlock;
  lifetimeTotals: Record<string, number>;
  openQueues: Record<string, number>;
  today: Record<string, number>;
  claimsValueMtd: Record<string, number | string>;
  recent: {
    claims: RecentItem[];
    encounters: RecentItem[];
    preauthorizations: RecentItem[];
  };
};

export type AnalyticsSeriesPoint = {
  period: string;
  value: number;
  rejected: number;
  rejection_rate: number;
  total_claimed: number;
  total_approved: number;
};

export type ReferralDestination = {
  health_facility_id?: number;
  health_facility_name?: string;
  health_facility_code?: string;
  total: number;
  approved: number;
  rejected: number;
  approval_rate: number;
};

export type AmountLeakageView = {
  total_claimed: number;
  total_approved: number;
  total_valuated: number;
  total_remunerated: number;
  approval_ratio: number;
  remuneration_ratio: number;
  leakage_amount: number;
};

export type ReferralsView = {
  total: number;
  approved: number;
  rejected: number;
  approval_rate: number;
  destinations: ReferralDestination[];
};

export type SeasonalityView = {
  by_day_of_week: Record<string, number>;
  by_hour: Record<number, number>;
};

export type DashboardAnalyticsView = {
  filterApplied: {
    dateFrom?: string;
    dateTo?: string;
    months?: number;
    granularity?: string;
    slaHours?: number;
  };
  comparisons: {
    current: Record<string, unknown>;
    previous: Record<string, unknown>;
    deltaPct: Record<string, number | null | undefined>;
  };
  series: AnalyticsSeriesPoint[];
  insights: { type: string; code: string; message: string }[];
  rates: Record<string, number>;
  sla: Record<string, number>;
  amountLeakage: AmountLeakageView;
  referrals: ReferralsView;
  seasonality: SeasonalityView;
};

export type DashboardQueryView = { months: number; granularity: DashboardGranularity };

/** `GET /api/dashboard` payload (and the page-load fallback). */
export type DashboardApiPayload = {
  metrics: DashboardMetricsView | null;
  metricsError: string | null;
  analytics: DashboardAnalyticsView | null;
  analyticsError: string | null;
  query: DashboardQueryView;
};
