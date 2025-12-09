

export interface FilterApplied {
    date_from: string;
    date_to: string;
    months: number;
    granularity: string;
}

export interface AmountMetrics {
    total_claimed: number;
    total_approved: number;
    total_valuated: number;
    total_reinsured: number;
    total_remunerated: number;
    avg_claimed: number;
    avg_approved: number;
    min_claimed: number;
    max_claimed: number;
    min_approved: number;
    max_approved: number;
}

export interface ClaimsMetric {
    total: number;
    rejected: number;
    entered: number;
    checked: number;
    valuated: number;
    unique_patients: number;
    approved: number;
    average_approved_amount: number;
    amount_metrics: AmountMetrics;
}

export interface EncountersMetric {
    total: number;
    rejected: number;
    entered: number;
    checked: number;
    valuated: number;
    unique_patients: number;
    approved: number;
    average_approved_amount: number;
    amount_metrics: AmountMetrics;
}

export interface PeriodBreakdown {
    period: string;
    total: number;
    entered: number;
    approved: number;
    rejected: number;
    pending: number;
    unique_patients: number;
}

export interface ReferralDestination {
    health_facility_id: number;
    health_facility_name: string;
    health_facility_code: string;
    total_referrals: number;
    approved: number;
    rejected: number;
}

export interface TopDiagnosis {
    diagnosis_id: number;
    diagnosis_code: string;
    diagnosis_name: string;
    total: number;
    approved: number;
    rejected: number;
}

export interface PreauthorizationsMetric {
    total: number;
    entered: number;
    approved: number;
    rejected: number;
    pending: number;
    unique_patients: number;
    by_status: Record<string, number>;
    period_breakdown: PeriodBreakdown[];
    referral_destinations: ReferralDestination[];
    top_diagnoses: TopDiagnosis[];
}

export interface TimeSeriesPeriodData {
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
    avg_claimed: number;
    avg_approved: number;
}

export interface TimeSeriesMetric {
    granularity: string;
    claims_by_month: TimeSeriesPeriodData[];
    encounters_by_month: TimeSeriesPeriodData[];
    combined_by_month: TimeSeriesPeriodData[];
}

export interface ProcessingStats {
    count: number;
    avg_hours: number;
    min_hours: number;
    max_hours: number;
    median_hours: number;
    std_dev_hours: number;
    percentile_25: number;
    percentile_75: number;
    percentile_90: number;
}

export interface SubmissionPatterns {
    by_day_of_week: Record<string, number>;
    total_with_submit_stamp: number;
    total_without_submit_stamp: number;
}

export interface StatusTransition {
    month: string;
    rejected: number;
    entered: number;
    checked: number;
    valuated: number;
    processed: number;
}

export interface ProcessingAnalytics {
    overall: ProcessingStats;
    claims: ProcessingStats;
    encounters: ProcessingStats;
    submission_patterns: SubmissionPatterns;
    status_transitions: StatusTransition[];
}

export interface HealthFacilityMetricModel {
    filter_applied: FilterApplied;
    claims: ClaimsMetric;
    encounters: EncountersMetric;
    preauthorizations: PreauthorizationsMetric;
    time_series: TimeSeriesMetric;
    processing_analytics: ProcessingAnalytics;
}

export class HealthFacilityMetric implements HealthFacilityMetricModel {
    filter_applied: FilterApplied;
    claims: ClaimsMetric;
    encounters: EncountersMetric;
    preauthorizations: PreauthorizationsMetric;
    time_series: TimeSeriesMetric;
    processing_analytics: ProcessingAnalytics;

    constructor(data: HealthFacilityMetricModel) {
        this.filter_applied = data.filter_applied;
        this.claims = data.claims;
        this.encounters = data.encounters;
        this.preauthorizations = data.preauthorizations;
        this.time_series = data.time_series;
        this.processing_analytics = data.processing_analytics;
    }

    getTotalClaims(): number {
        return this.claims.total;
    }

    getTotalEncounters(): number {
        return this.encounters.total;
    }

    getTotalPreauthorizations(): number {
        return this.preauthorizations.total;
    }

    getApprovalRate(): number {
        const total = this.claims.total + this.encounters.total;
        const approved = this.claims.approved + this.encounters.approved;
        return total > 0 ? (approved / total) * 100 : 0;
    }

    getRejectionRate(): number {
        const total = this.claims.total + this.encounters.total;
        const rejected = this.claims.rejected + this.encounters.rejected;
        return total > 0 ? (rejected / total) * 100 : 0;
    }

    getTopReferralDestinations(limit: number = 5): ReferralDestination[] {
        return this.preauthorizations.referral_destinations.slice(0, limit);
    }

    getTopDiagnoses(limit: number = 5): TopDiagnosis[] {
        return this.preauthorizations.top_diagnoses.slice(0, limit);
    }

    toJSON(): HealthFacilityMetricModel {
        return {
            filter_applied: this.filter_applied,
            claims: this.claims,
            encounters: this.encounters,
            preauthorizations: this.preauthorizations,
            time_series: this.time_series,
            processing_analytics: this.processing_analytics
        };
    }

    static fromJSON(json: any): HealthFacilityMetric {
        return new HealthFacilityMetric(json as HealthFacilityMetricModel);
    }
}