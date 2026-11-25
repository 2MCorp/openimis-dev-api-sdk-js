import type { OpenIMISDevApiSdk } from "../../index";
import type { ApiResponse } from "../../api_response";
import { PH_PORTAL_PERMISSIONS } from "../../auth/permissions";
import { ContractListFilters, EmployeeListFilters, FhirListParams } from "../../formalsector/types";
import type { GatewayTransaction } from "../../formalsector/payment_gateway";
import { collectAllPages } from "../../utils/pagination";
import type { CollectedItems } from "../../utils/pagination";
import { rowsToCsv } from "../../utils/csv";
import type { CsvColumn } from "../../utils/csv";
import { humanizeInputName } from "./calculation";
import type { ContractDto, EmployeeDto, HealthPackageDto, PaymentDto } from "./dto";
import { fail, httpStatus } from "./envelope";
import type { ApiEnvelope } from "./envelope";
import { toUserFacingApiError } from "../common/user_facing_error";
import {
  serializeContract,
  serializeEmployee,
  serializeHealthPackage,
  serializePayment,
} from "./serialize";

export const REPORT_KINDS = [
  "members",
  "contracts",
  "payments",
  "online-payments",
  "health-packages",
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export function isReportKind(value: string): value is ReportKind {
  return (REPORT_KINDS as readonly string[]).includes(value);
}

export const REPORT_PERMISSIONS: Record<ReportKind, string> = {
  members: PH_PORTAL_PERMISSIONS.viewEmployees,
  contracts: PH_PORTAL_PERMISSIONS.viewContracts,
  payments: PH_PORTAL_PERMISSIONS.viewPayments,
  "online-payments": PH_PORTAL_PERMISSIONS.viewPayments,
  "health-packages": PH_PORTAL_PERMISSIONS.viewPlans,
};

/** Export columns — which fields each report contains is a portal (presentation) choice. */
const MEMBER_COLUMNS: CsvColumn<EmployeeDto>[] = [
  { header: "CHF ID", value: (e) => e.chfId },
  { header: "Last name", value: (e) => e.lastName },
  { header: "Other names", value: (e) => e.otherNames },
  { header: "Birth date", value: (e) => e.birthDate },
  { header: "Health package", value: (e) => e.planName },
  { header: "Package code", value: (e) => e.planCode },
];

/**
 * One column per calculation input found on the members (income, ...): which inputs
 * exist depends on each package's calculation rule sets, so they are not fixed.
 */
export function memberReportColumns(rows: EmployeeDto[]): CsvColumn<EmployeeDto>[] {
  const names = [...new Set(rows.flatMap((e) => Object.keys(e.calculationRule)))];
  const inputs: CsvColumn<EmployeeDto>[] = names.map((name) => ({
    header: humanizeInputName(name),
    value: (e) => e.calculationRule[name],
  }));
  return [...MEMBER_COLUMNS.slice(0, 4), ...inputs, ...MEMBER_COLUMNS.slice(4)];
}

export const CONTRACT_REPORT_COLUMNS: CsvColumn<ContractDto>[] = [
  { header: "Code", value: (c) => c.code },
  { header: "State", value: (c) => c.status },
  { header: "Valid from", value: (c) => c.dateValidFrom },
  { header: "Valid to", value: (c) => c.dateValidTo },
  { header: "Members", value: (c) => c.subjects.length },
  { header: "Amount", value: (c) => c.amount },
  { header: "Currency", value: (c) => c.currency },
  { header: "Payment reference", value: (c) => c.paymentReference },
];

export const PAYMENT_REPORT_COLUMNS: CsvColumn<PaymentDto>[] = [
  { header: "Receipt", value: (p) => p.receiptNo },
  { header: "Status", value: (p) => p.statusKey },
  { header: "Payment date", value: (p) => p.paymentDate || p.created },
  { header: "Amount", value: (p) => p.amount },
  { header: "Currency", value: (p) => p.currency },
  { header: "Contract", value: (p) => p.contractCode },
];

export const ONLINE_PAYMENT_REPORT_COLUMNS: CsvColumn<GatewayTransaction>[] = [
  { header: "Transaction", value: (t) => t.id },
  { header: "Date", value: (t) => t.completedAt || t.initiatedAt },
  { header: "Contract", value: (t) => t.contractCode },
  { header: "Provider", value: (t) => t.provider },
  { header: "Method", value: (t) => t.paymentMethod },
  { header: "Status", value: (t) => t.statusKey },
  { header: "Amount", value: (t) => t.amount },
  { header: "Currency", value: (t) => t.currency },
];

export const PACKAGE_REPORT_COLUMNS: CsvColumn<HealthPackageDto>[] = [
  { header: "Name", value: (p) => p.name },
  { header: "Bundle code", value: (p) => p.bundleCode },
  {
    header: "Contribution plans",
    value: (p) =>
      p.plans
        .map((plan) => plan.name || plan.code)
        .filter(Boolean)
        .join("; "),
  },
];

type CsvOutcome = { ok: true; csv: string } | { ok: false; status: number; message: string };

function csvOutcome<T, U>(
  resp: ApiResponse<CollectedItems<T>>,
  serialize: (item: T) => U,
  columns: CsvColumn<U>[] | ((rows: U[]) => CsvColumn<U>[])
): CsvOutcome {
  if (!resp.success || !resp.data) {
    return { ok: false, status: Number(resp.statusCode) || 0, message: resp.message };
  }
  const rows = resp.data.items.map(serialize);
  return { ok: true, csv: rowsToCsv(typeof columns === "function" ? columns(rows) : columns, rows) };
}

/** Full-list CSV built with the SDK paginator (capped at 50 pages × 50 rows). */
export async function buildReportCsv(sdk: OpenIMISDevApiSdk, kind: ReportKind): Promise<CsvOutcome> {
  const fs = sdk.formalSector;
  const paging = { pageSize: 50, maxPages: 50 };
  switch (kind) {
    case "members":
      return csvOutcome(
        await collectAllPages((p, n) => fs.employees.list(new EmployeeListFilters(p, n)), paging),
        serializeEmployee,
        memberReportColumns
      );
    case "contracts":
      return csvOutcome(
        await collectAllPages((p, n) => fs.contracts.list(new ContractListFilters(p, n)), paging),
        serializeContract,
        CONTRACT_REPORT_COLUMNS
      );
    case "payments":
      return csvOutcome(
        await collectAllPages((p, n) => fs.payments.list(new FhirListParams(p, n)), paging),
        serializePayment,
        PAYMENT_REPORT_COLUMNS
      );
    case "online-payments":
      return csvOutcome(await fs.paymentGateway.allTransactions(), (t) => t, ONLINE_PAYMENT_REPORT_COLUMNS);
    case "health-packages": {
      const resp = await fs.insurancePlans.listPackages();
      if (!resp.success || !resp.data) {
        return { ok: false, status: Number(resp.statusCode) || 0, message: resp.message };
      }
      return { ok: true, csv: rowsToCsv(PACKAGE_REPORT_COLUMNS, resp.data.map(serializeHealthPackage)) };
    }
  }
}

export type ReportFile = {
  filename: string;
  contentType: string;
  /** CSV with a UTF-8 BOM so Excel opens non-ASCII names correctly. */
  content: string;
  /** Ready-made response headers (`Content-Type`, `Content-Disposition`, `Cache-Control`). */
  headers: Record<string, string>;
};

export type ReportResult =
  | { status: 200; file: ReportFile }
  | ApiEnvelope<never>;

export function reportFilename(kind: ReportKind, now: Date = new Date()): string {
  return `${kind}-${now.toISOString().slice(0, 10)}.csv`;
}

/** `GET /api/reports/[kind]` — CSV download or a failure envelope. */
export async function handleReportDownload(
  sdk: OpenIMISDevApiSdk,
  kind: string,
  now: Date = new Date()
): Promise<ReportResult> {
  if (!isReportKind(kind)) return fail(404, "Unknown report.");
  const result = await buildReportCsv(sdk, kind);
  if (!result.ok) {
    return fail(httpStatus(result.status, 502), toUserFacingApiError(result.status, result.message));
  }
  const filename = reportFilename(kind, now);
  return {
    status: 200,
    file: {
      filename,
      contentType: "text/csv; charset=utf-8",
      content: `﻿${result.csv}`,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    },
  };
}
