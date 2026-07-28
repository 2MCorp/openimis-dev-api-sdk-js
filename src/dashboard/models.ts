function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export class DashboardFilterApplied {
  constructor(
    public readonly dateFrom?: string,
    public readonly dateTo?: string,
    public readonly months?: number,
    public readonly granularity?: string,
    public readonly expiringDays?: number,
    public readonly recentLimit?: number,
    public readonly priorDateFrom?: string,
    public readonly priorDateTo?: string,
    public readonly slaHours?: number
  ) {}

  static fromJSON(data: unknown): DashboardFilterApplied {
    const record = asRecord(data);
    return new DashboardFilterApplied(
      asString(record.date_from),
      asString(record.date_to),
      asNumber(record.months),
      asString(record.granularity),
      asNumber(record.expiring_days),
      asNumber(record.recent_limit),
      asString(record.prior_date_from),
      asString(record.prior_date_to),
      asNumber(record.sla_hours)
    );
  }
}

export class DashboardInsight {
  constructor(
    public readonly type: string,
    public readonly code: string,
    public readonly message: string,
    public readonly meta?: Record<string, unknown>
  ) {}

  static fromJSON(data: unknown): DashboardInsight {
    const record = asRecord(data);
    return new DashboardInsight(
      asString(record.type) ?? "info",
      asString(record.code) ?? "",
      asString(record.message) ?? "",
      record.meta ? asRecord(record.meta) : undefined
    );
  }
}

export class DashboardComparisonBlock {
  constructor(
    public readonly current: Record<string, unknown>,
    public readonly previous: Record<string, unknown>,
    public readonly deltaPct: Record<string, number | null | undefined>
  ) {}

  static fromJSON(data: unknown): DashboardComparisonBlock {
    const record = asRecord(data);
    return new DashboardComparisonBlock(
      asRecord(record.current),
      asRecord(record.previous),
      asRecord(record.delta_pct) as Record<string, number | null | undefined>
    );
  }
}

/** Policy-holder metric payload. */
export class PolicyHolderMetricResponse {
  constructor(
    public readonly filterApplied: DashboardFilterApplied,
    public readonly employees: Record<string, unknown>,
    public readonly contracts: Record<string, unknown>,
    public readonly insurancePlans: Record<string, unknown>,
    public readonly contributions: Record<string, unknown>,
    public readonly payments: Record<string, unknown>,
    public readonly claimsSummary: Record<string, unknown>,
    public readonly raw: Record<string, unknown>
  ) {}

  static fromJSON(data: Record<string, unknown>): PolicyHolderMetricResponse {
    return new PolicyHolderMetricResponse(
      DashboardFilterApplied.fromJSON(data.filter_applied),
      asRecord(data.employees),
      asRecord(data.contracts),
      asRecord(data.insurance_plans),
      asRecord(data.contributions),
      asRecord(data.payments),
      asRecord(data.claims_summary),
      data
    );
  }
}

/** Health-facility metric payload. */
export class HealthFacilityMetricResponse {
  constructor(
    public readonly filterApplied: DashboardFilterApplied,
    public readonly claims: Record<string, unknown>,
    public readonly encounters: Record<string, unknown>,
    public readonly preauthorizations: Record<string, unknown>,
    public readonly timeSeries: unknown[],
    public readonly processingAnalytics: Record<string, unknown>,
    public readonly lifetimeTotals: Record<string, unknown>,
    public readonly openQueues: Record<string, unknown>,
    public readonly today: Record<string, unknown>,
    public readonly claimsValueMtd: Record<string, unknown>,
    public readonly recent: Record<string, unknown>,
    public readonly raw: Record<string, unknown>
  ) {}

  static fromJSON(
    data: Record<string, unknown>
  ): HealthFacilityMetricResponse {
    return new HealthFacilityMetricResponse(
      DashboardFilterApplied.fromJSON(data.filter_applied),
      asRecord(data.claims),
      asRecord(data.encounters),
      asRecord(data.preauthorizations),
      Array.isArray(data.time_series) ? data.time_series : [],
      asRecord(data.processing_analytics),
      asRecord(data.lifetime_totals),
      asRecord(data.open_queues),
      asRecord(data.today),
      asRecord(data.claims_value_mtd),
      asRecord(data.recent),
      data
    );
  }
}

/** System metric payload. */
export class SystemMetricResponse {
  constructor(
    public readonly apiKeys: Record<string, unknown>,
    public readonly insureeUsers: Record<string, unknown>,
    public readonly plugins: Record<string, unknown>,
    public readonly dataImports: Record<string, unknown>,
    public readonly eventBus: Record<string, unknown>,
    public readonly raw: Record<string, unknown>
  ) {}

  static fromJSON(data: Record<string, unknown>): SystemMetricResponse {
    return new SystemMetricResponse(
      asRecord(data.api_keys),
      asRecord(data.insuree_users),
      asRecord(data.plugins),
      asRecord(data.data_imports),
      asRecord(data.event_bus),
      data
    );
  }
}

export class PolicyHolderAnalyticsResponse {
  constructor(
    public readonly filterApplied: DashboardFilterApplied,
    public readonly comparisons: DashboardComparisonBlock,
    public readonly series: unknown[],
    public readonly insights: DashboardInsight[],
    public readonly paymentGap: Record<string, unknown>,
    public readonly enrollmentVelocity: Record<string, unknown>,
    public readonly contractFunnel: Record<string, unknown>,
    public readonly costDrivers: Record<string, unknown>,
    public readonly raw: Record<string, unknown>
  ) {}

  static fromJSON(
    data: Record<string, unknown>
  ): PolicyHolderAnalyticsResponse {
    return new PolicyHolderAnalyticsResponse(
      DashboardFilterApplied.fromJSON(data.filter_applied),
      DashboardComparisonBlock.fromJSON(data.comparisons),
      Array.isArray(data.series) ? data.series : [],
      Array.isArray(data.insights)
        ? data.insights.map((item) => DashboardInsight.fromJSON(item))
        : [],
      asRecord(data.payment_gap),
      asRecord(data.enrollment_velocity),
      asRecord(data.contract_funnel),
      asRecord(data.cost_drivers),
      data
    );
  }
}

export class HealthFacilityAnalyticsResponse {
  constructor(
    public readonly filterApplied: DashboardFilterApplied,
    public readonly comparisons: DashboardComparisonBlock,
    public readonly series: unknown[],
    public readonly insights: DashboardInsight[],
    public readonly rates: Record<string, unknown>,
    public readonly sla: Record<string, unknown>,
    public readonly amountLeakage: Record<string, unknown>,
    public readonly referrals: Record<string, unknown>,
    public readonly seasonality: Record<string, unknown>,
    public readonly raw: Record<string, unknown>
  ) {}

  static fromJSON(
    data: Record<string, unknown>
  ): HealthFacilityAnalyticsResponse {
    return new HealthFacilityAnalyticsResponse(
      DashboardFilterApplied.fromJSON(data.filter_applied),
      DashboardComparisonBlock.fromJSON(data.comparisons),
      Array.isArray(data.series) ? data.series : [],
      Array.isArray(data.insights)
        ? data.insights.map((item) => DashboardInsight.fromJSON(item))
        : [],
      asRecord(data.rates),
      asRecord(data.sla),
      asRecord(data.amount_leakage),
      asRecord(data.referrals),
      asRecord(data.seasonality),
      data
    );
  }
}

export class SystemAnalyticsResponse {
  constructor(
    public readonly filterApplied: DashboardFilterApplied,
    public readonly comparisons: DashboardComparisonBlock,
    public readonly series: unknown[],
    public readonly insights: DashboardInsight[],
    public readonly apiKeyLifecycle: Record<string, unknown>,
    public readonly pluginHealth: Record<string, unknown>,
    public readonly importHealth: Record<string, unknown>,
    public readonly insureeAdoption: Record<string, unknown>,
    public readonly raw: Record<string, unknown>
  ) {}

  static fromJSON(data: Record<string, unknown>): SystemAnalyticsResponse {
    return new SystemAnalyticsResponse(
      DashboardFilterApplied.fromJSON(data.filter_applied),
      DashboardComparisonBlock.fromJSON(data.comparisons),
      Array.isArray(data.series) ? data.series : [],
      Array.isArray(data.insights)
        ? data.insights.map((item) => DashboardInsight.fromJSON(item))
        : [],
      asRecord(data.api_key_lifecycle),
      asRecord(data.plugin_health),
      asRecord(data.import_health),
      asRecord(data.insuree_adoption),
      data
    );
  }
}
