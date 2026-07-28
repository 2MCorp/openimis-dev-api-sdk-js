export type DashboardGranularity = "month" | "week" | "day";

export const DASHBOARD_BASE_PATH = "/dashboard";

export class DashboardQueryParams {
  constructor(
    public months?: number,
    public granularity: DashboardGranularity = "month",
    public dateFrom?: string,
    public dateTo?: string,
    public expiringDays?: number,
    public recentLimit?: number,
    public slaHours?: number
  ) {}

  toQuery(): Record<string, string | number | boolean | undefined> {
    return {
      months: this.months,
      granularity: this.granularity,
      date_from: this.dateFrom,
      date_to: this.dateTo,
      expiring_days: this.expiringDays,
      recent_limit: this.recentLimit,
      sla_hours: this.slaHours,
    };
  }
}
