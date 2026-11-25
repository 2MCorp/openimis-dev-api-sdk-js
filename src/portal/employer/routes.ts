import type { OpenIMISDevApiSdk } from "../../index";
import type { ApiResponse } from "../../api_response";
import { hasPermission, PH_PORTAL_PERMISSIONS } from "../../auth/permissions";
import { approvedDateRange } from "../../formalsector/contract_ops";
import { calculationFieldErrors, employeeUploadTemplateCsv } from "../../formalsector/calculation_inputs";
import { groupContractStateCounts } from "../../formalsector/contract_states";
import { normalizeDashboardQuery } from "../../dashboard/policy_holder_views";
import {
  EmployeeClaimListFilters,
  EmployeeListFilters,
  ContractListFilters,
  PaymentListFilters,
} from "../../formalsector/types";
import type { GatewayTransaction, PaymentGatewayMethod, PaymentRedirect } from "../../formalsector/payment_gateway";
import { describeErrorDetails } from "../../utils/errors";
import { toUserFacingApiError } from "../common/user_facing_error";
import { ACCESS_PERMISSIONS } from "./access";
import type {
  BulkUploadResultDto,
  CalculationFormDto,
  ClaimDto,
  ContractDto,
  DashboardApiPayload,
  EmployeeDetailDto,
  EmployeeDto,
  FamilyGroupDto,
  HealthPackageDto,
  InsureeDto,
  PaymentDto,
  SearchPageDto,
} from "./dto";
import {
  fail,
  httpStatus,
  ok,
  pagingFromParams,
  param,
  respond,
  toSearchParams,
} from "./envelope";
import type { ApiEnvelope, SearchParamsInput } from "./envelope";
import { fileToBase64 } from "./upload";
import { paymentReturnUrl } from "./checkout";
import { REPORT_PERMISSIONS, isReportKind } from "./reports";
import {
  serializeCalculationForm,
  serializeClaim,
  serializeContract,
  serializeEmployee,
  serializeFamilyGroup,
  serializeHealthPackage,
  serializeInsuree,
  serializePayment,
  serializeSearchPage,
} from "./serialize";
import {
  parseAddEmployeeBody,
  parseCreateContractBody,
  parsePayContractBody,
  parseUpdateEmployeeBody,
  parseUploadEmployeesBody,
} from "./validation";

/**
 * One function per employer-portal API route. Each takes an `OpenIMISDevApiSdk` scoped to
 * the signed-in user (token + active `PolicyHolder-Code`) plus plain inputs, and returns an
 * `{ status, body }` envelope with the same JSON shapes and status codes as the original
 * SvelteKit routes. A route handler is: authenticate → `authorizeEmployerRoute` → call →
 * `Response.json(result.body, { status: result.status })`.
 */

type Sdk = OpenIMISDevApiSdk;

/** Needed where insuree photos are resolved: the public developer-API root. */
export type EmployerApiContext = { apiBaseUrl: string };

// ── Authorization ───────────────────────────────────────────────────────────────────

/** Route key (`"METHOD /api/path"`, dynamic segments as `[id]`) → required permission. */
export const EMPLOYER_ROUTE_PERMISSIONS: Record<string, string> = {
  "GET /api/contracts": PH_PORTAL_PERMISSIONS.viewContracts,
  "POST /api/contracts": PH_PORTAL_PERMISSIONS.manageContracts,
  "GET /api/contracts/[id]": PH_PORTAL_PERMISSIONS.viewContracts,
  "GET /api/dashboard": PH_PORTAL_PERMISSIONS.viewDashboard,
  "GET /api/health-packages": PH_PORTAL_PERMISSIONS.viewPlans,
  "GET /api/health-packages/[id]": PH_PORTAL_PERMISSIONS.viewPlans,
  "GET /api/insurees/search": PH_PORTAL_PERMISSIONS.viewEmployees,
  "GET /api/member-claims/[id]": PH_PORTAL_PERMISSIONS.viewEmployeeClaims,
  "GET /api/members": PH_PORTAL_PERMISSIONS.viewEmployees,
  "POST /api/members": PH_PORTAL_PERMISSIONS.manageEmployees,
  "GET /api/members/calculation-params": PH_PORTAL_PERMISSIONS.viewEmployees,
  "GET /api/members/[id]": PH_PORTAL_PERMISSIONS.viewEmployees,
  "PATCH /api/members/[id]": PH_PORTAL_PERMISSIONS.manageEmployees,
  "GET /api/members/[id]/calculation-params": PH_PORTAL_PERMISSIONS.viewEmployees,
  "GET /api/members/[id]/claims": PH_PORTAL_PERMISSIONS.viewEmployeeClaims,
  "GET /api/members/[id]/family": PH_PORTAL_PERMISSIONS.viewEmployees,
  "POST /api/members/upload": PH_PORTAL_PERMISSIONS.manageEmployees,
  "GET /api/members/upload-template": PH_PORTAL_PERMISSIONS.manageEmployees,
  "GET /api/payment-gateway/methods": PH_PORTAL_PERMISSIONS.viewPayments,
  "POST /api/payment-gateway/pay": PH_PORTAL_PERMISSIONS.managePayments,
  "GET /api/payment-gateway/transactions": PH_PORTAL_PERMISSIONS.viewPayments,
  "GET /api/payment-gateway/transactions/[id]": PH_PORTAL_PERMISSIONS.viewPayments,
  "GET /api/payments": PH_PORTAL_PERMISSIONS.viewPayments,
};

/** Routes that answer 404 unless online payments are switched on. */
export function isOnlinePaymentsRoute(routeKey: string): boolean {
  return routeKey.includes("/api/payment-gateway/");
}

type PermissionHolder = { permissions?: readonly string[] | null } | null | undefined;

/**
 * Gate for an API route: 404 for payment-gateway routes when online payments are off,
 * 401 without a user, 403 without the route's permission. `null` means "go ahead".
 * Report routes are keyed `"GET /api/reports/<kind>"`; an unknown kind is a 404.
 */
export function authorizeEmployerRoute(
  user: PermissionHolder,
  routeKey: string,
  options: { onlinePayments?: boolean } = {}
): ApiEnvelope<never> | null {
  if (isOnlinePaymentsRoute(routeKey) && !options.onlinePayments) {
    return fail(404, "Online payments are not enabled.");
  }
  let permission: string | undefined;
  const report = /^GET \/api\/reports\/(.+)$/.exec(routeKey);
  if (report) {
    if (!isReportKind(report[1])) return fail(404, "Unknown report.");
    permission = REPORT_PERMISSIONS[report[1]];
  } else {
    permission = EMPLOYER_ROUTE_PERMISSIONS[routeKey];
    if (permission === undefined) return fail(404, "Not found");
  }
  if (!user) return fail(401, "Unauthorized");
  if (!hasPermission(user, permission)) {
    return fail(403, "You do not have permission to perform this action.");
  }
  return null;
}

/** Permission behind a feature flag (`manageMembers` → `api_auth.manage_employees`). */
export function permissionFor(access: keyof typeof ACCESS_PERMISSIONS): string {
  return ACCESS_PERMISSIONS[access];
}

// ── Contracts ───────────────────────────────────────────────────────────────────────

/** `GET /api/contracts` — `?page-offset&_count&code&approvedFrom&approvedTo&chfId`. */
export async function handleContractsList(
  sdk: Sdk,
  input?: SearchParamsInput
): Promise<ApiEnvelope<SearchPageDto<ContractDto>>> {
  const q = toSearchParams(input);
  const { pageOffset, count } = pagingFromParams(q);
  const resp = await sdk.formalSector.contracts.list(
    new ContractListFilters(
      pageOffset,
      count,
      param(q, "code") || undefined,
      approvedDateRange(param(q, "approvedFrom"), param(q, "approvedTo")),
      param(q, "chfId") || undefined
    )
  );
  return respond(resp, (page) => serializeSearchPage(page, serializeContract));
}

/** `GET /api/contracts/[id]` */
export async function handleContractGet(sdk: Sdk, id: string): Promise<ApiEnvelope<ContractDto>> {
  return respond(await sdk.formalSector.contracts.get(id), serializeContract, {
    notFoundMessage: "Contract not found.",
  });
}

/** `POST /api/contracts` — body `{ code, dateValidFrom, dateValidTo }` → 201. */
export async function handleContractCreate(sdk: Sdk, body: unknown): Promise<ApiEnvelope<ContractDto>> {
  const resp = await sdk.formalSector.contracts.createDraft(parseCreateContractBody(body));
  return respond(resp, serializeContract, { status: 201 });
}

// ── Dashboard ───────────────────────────────────────────────────────────────────────

/** `?months&granularity` → normalised dashboard query. */
export function parseDashboardQuery(input?: SearchParamsInput) {
  const q = toSearchParams(input);
  return normalizeDashboardQuery({
    months: q.get("months") ?? undefined,
    granularity: q.get("granularity") ?? undefined,
  });
}

/** Metrics + analytics as SDK summaries; each half can fail on its own. */
export async function loadEmployerDashboard(
  sdk: Sdk,
  query: ReturnType<typeof parseDashboardQuery>
): Promise<DashboardApiPayload> {
  const { metrics, analytics } = await sdk.dashboard.policyHolderOverview(query);
  return {
    metrics: metrics.data,
    metricsError: metrics.success ? null : toUserFacingApiError(metrics.statusCode, metrics.message),
    contractGroups: metrics.data ? groupContractStateCounts(metrics.data.contracts.byState) : null,
    analytics: analytics.data,
    analyticsError: analytics.success
      ? null
      : toUserFacingApiError(analytics.statusCode, analytics.message),
    query,
  };
}

/** `GET /api/dashboard` — `?months&granularity`. */
export async function handleDashboard(
  sdk: Sdk,
  input?: SearchParamsInput
): Promise<ApiEnvelope<DashboardApiPayload>> {
  return ok(await loadEmployerDashboard(sdk, parseDashboardQuery(input)));
}

// ── Health packages ─────────────────────────────────────────────────────────────────

/** `GET /api/health-packages` — `?code` or `?enrollable=1` (packages an employee can join). */
export async function handleHealthPackagesList(
  sdk: Sdk,
  input?: SearchParamsInput
): Promise<ApiEnvelope<HealthPackageDto[]>> {
  const q = toSearchParams(input);
  const plans = sdk.formalSector.insurancePlans;
  const resp =
    q.get("enrollable") === "1"
      ? await plans.listEnrollablePackages()
      : await plans.listPackages(param(q, "code") || undefined);
  return respond(resp, (rows) => rows.map(serializeHealthPackage));
}

/** `GET /api/health-packages/[id]` */
export async function handleHealthPackageGet(sdk: Sdk, id: string): Promise<ApiEnvelope<HealthPackageDto>> {
  return respond(await sdk.formalSector.insurancePlans.get(id), serializeHealthPackage, {
    notFoundMessage: "Health package not found.",
  });
}

// ── Members (employees) ─────────────────────────────────────────────────────────────

/** `GET /api/members` — `?page-offset&_count&chfId&lastName&otherNames`. */
export async function handleMembersList(
  sdk: Sdk,
  input?: SearchParamsInput
): Promise<ApiEnvelope<SearchPageDto<EmployeeDto>>> {
  const q = toSearchParams(input);
  const { pageOffset, count } = pagingFromParams(q);
  const resp = await sdk.formalSector.employees.list(
    new EmployeeListFilters(
      pageOffset,
      count,
      param(q, "chfId") || undefined,
      param(q, "lastName") || undefined,
      param(q, "otherNames") || undefined
    )
  );
  return respond(resp, (page) => serializeSearchPage(page, serializeEmployee));
}

/** Field errors (`calculationRule.income` → message) of a failed enrol / update. */
export function memberFieldErrors(resp: ApiResponse<unknown>): Record<string, string> | undefined {
  if (resp.success) return undefined;
  const entries = calculationFieldErrors(resp.errorDetails).map((e) => [e.field, e.message]);
  // DRF-style `{ field, errors: [...] }` details that name a calculation input.
  for (const detail of resp.errorDetails ?? []) {
    const d = detail as { field?: unknown; errors?: unknown };
    if (typeof d?.field === "string" && d.errors != null) {
      entries.push([d.field, [d.errors].flat().map(String).join(" ")]);
    }
  }
  return entries.length ? Object.fromEntries(entries) : undefined;
}

/**
 * The SDK reports a bare "Bad request" when the backend's 400 body isn't a plain
 * `detail`/`message`; the real reason is in `errorDetails`.
 */
export function memberFailureMessage(
  resp: ApiResponse<unknown>,
  fieldErrors?: Record<string, string>
): string {
  if (resp.success) return resp.message;
  const [first] = fieldErrors ? Object.values(fieldErrors) : [];
  const described = describeErrorDetails(resp.errorDetails, 3).join(" ");
  return first ?? (described || resp.message);
}

/** `POST /api/members` — body `{ chfId, policyHolderContributionPlanId, calculationRule? }` → 201. */
export async function handleMemberCreate(sdk: Sdk, body: unknown): Promise<ApiEnvelope<EmployeeDto>> {
  const resp = await sdk.formalSector.enrollEmployee(parseAddEmployeeBody(body));
  const fieldErrors = memberFieldErrors(resp);
  return respond(resp, serializeEmployee, {
    status: 201,
    fieldErrors,
    message: memberFailureMessage(resp, fieldErrors),
  });
}

/** `GET /api/members/[id]` — employee plus employer-scoped insuree demographics. */
export async function handleMemberGet(
  sdk: Sdk,
  id: string,
  ctx: EmployerApiContext
): Promise<ApiEnvelope<EmployeeDetailDto>> {
  const fs = sdk.formalSector;
  const [resp, form] = await Promise.all([fs.getEmployeeProfile(id), fs.employees.calculationParamsFor(id)]);
  return respond(
    resp,
    (profile) => ({
      employee: serializeEmployee(profile.employee),
      insuree: profile.insuree ? serializeInsuree(profile.insuree, ctx.apiBaseUrl) : null,
      calculation: form.success && form.data ? serializeCalculationForm(form.data) : null,
    }),
    { notFoundMessage: "Member not found." }
  );
}

/** `PATCH /api/members/[id]` — body `{ policyHolderContributionPlanId?, calculationRule? }`. */
export async function handleMemberUpdate(
  sdk: Sdk,
  id: string,
  body: unknown
): Promise<ApiEnvelope<EmployeeDto>> {
  const resp = await sdk.formalSector.updateEmployee(id, parseUpdateEmployeeBody(body));
  const fieldErrors = memberFieldErrors(resp);
  return respond(resp, serializeEmployee, {
    notFoundMessage: "Member not found.",
    fieldErrors,
    message: memberFailureMessage(resp, fieldErrors),
  });
}

/** `GET /api/members/calculation-params` — inputs a new employee needs: `?planId=`. */
export async function handleCalculationParams(
  sdk: Sdk,
  input?: SearchParamsInput
): Promise<ApiEnvelope<CalculationFormDto>> {
  const planId = param(toSearchParams(input), "planId") ?? "";
  return respond(await sdk.formalSector.employees.calculationParams(planId), serializeCalculationForm);
}

/** `GET /api/members/[id]/calculation-params` — stored values; `?planId=` for another package. */
export async function handleMemberCalculationParams(
  sdk: Sdk,
  id: string,
  input?: SearchParamsInput
): Promise<ApiEnvelope<CalculationFormDto>> {
  const planId = param(toSearchParams(input), "planId") || undefined;
  return respond(await sdk.formalSector.employees.calculationParamsFor(id, planId), serializeCalculationForm, {
    notFoundMessage: "Member not found.",
  });
}

/** `GET /api/members/[id]/claims` — `?page-offset&_count`. */
export async function handleMemberClaims(
  sdk: Sdk,
  id: string,
  input?: SearchParamsInput
): Promise<ApiEnvelope<SearchPageDto<ClaimDto>>> {
  const { pageOffset, count } = pagingFromParams(toSearchParams(input));
  const resp = await sdk.formalSector.employeeClaims.list(new EmployeeClaimListFilters(pageOffset, count, id));
  return respond(resp, (page) => serializeSearchPage(page, serializeClaim));
}

/** `GET /api/member-claims/[id]` */
export async function handleMemberClaimGet(sdk: Sdk, claimId: string): Promise<ApiEnvelope<ClaimDto>> {
  return respond(await sdk.formalSector.employeeClaims.get(claimId), serializeClaim, {
    notFoundMessage: "Claim not found.",
  });
}

/** `GET /api/members/[id]/family` — `data: null` when the member has no family group. */
export async function handleMemberFamily(
  sdk: Sdk,
  id: string
): Promise<ApiEnvelope<FamilyGroupDto | null>> {
  const resp = await sdk.formalSector.groups.getByEmployeeUuid(id);
  if (!resp.success) return respond(resp as ApiResponse<never>, () => null);
  return ok(resp.data ? serializeFamilyGroup(resp.data) : null);
}

/** `GET /api/insurees/search` — `?identifier=<CHF ID>`. */
export async function handleInsureeSearch(
  sdk: Sdk,
  input: SearchParamsInput | undefined,
  ctx: EmployerApiContext
): Promise<ApiEnvelope<InsureeDto>> {
  const identifier = param(toSearchParams(input), "identifier");
  if (!identifier) return fail(400, "An insuree identifier is required.");
  return respond(
    await sdk.formalSector.searchEmployees.getByChfId(identifier),
    (patient) => serializeInsuree(patient, ctx.apiBaseUrl),
    { notFoundMessage: `No insuree found for “${identifier}”.` }
  );
}

/** `GET /api/members/upload-template` — `?planId=&planCode=` → `{ csv }`. */
export async function handleMembersUploadTemplate(
  sdk: Sdk,
  input?: SearchParamsInput
): Promise<ApiEnvelope<{ csv: string }>> {
  const q = toSearchParams(input);
  const planId = param(q, "planId") ?? "";
  const planCode = param(q, "planCode") ?? "";
  const resp = await sdk.formalSector.employees.calculationParams(planId);
  return respond(resp, (form) => ({
    csv: employeeUploadTemplateCsv(form.parameters, planCode || undefined),
  }));
}

/**
 * `POST /api/members/upload` with the JSON body `{ fileName, base64, defaultPlanCode? }`
 * → 201 `{ created, employees }`. The SDK validates file type and size; the backend then
 * parses the rows (all-or-nothing). Failures carry `rowErrors`.
 */
export async function handleMembersUpload(
  sdk: Sdk,
  body: unknown
): Promise<ApiEnvelope<BulkUploadResultDto>> {
  const resp = await sdk.formalSector.employees.uploadFile(parseUploadEmployeesBody(body));
  if (!resp.success || !resp.data) {
    const status = Number(resp.statusCode) || 0;
    return fail(httpStatus(status), toUserFacingApiError(status, resp.message), {
      rowErrors: describeErrorDetails(resp.errorDetails),
    });
  }
  const employees = resp.data.map(serializeEmployee);
  return ok({ created: employees.length, employees }, 201);
}

/** Same as `handleMembersUpload`, for a multipart upload (`File` from `FormData`). */
export async function handleMembersUploadFile(
  sdk: Sdk,
  file: { name: string; arrayBuffer(): Promise<ArrayBuffer> },
  defaultPlanCode?: string
): Promise<ApiEnvelope<BulkUploadResultDto>> {
  return handleMembersUpload(sdk, {
    fileName: file.name,
    base64: await fileToBase64(file),
    defaultPlanCode,
  });
}

// ── Payments & payment gateway ──────────────────────────────────────────────────────

/** `GET /api/payments` — `?page-offset&_count&chfId`. */
export async function handlePaymentsList(
  sdk: Sdk,
  input?: SearchParamsInput
): Promise<ApiEnvelope<SearchPageDto<PaymentDto>>> {
  const q = toSearchParams(input);
  const { pageOffset, count } = pagingFromParams(q);
  const resp = await sdk.formalSector.payments.list(
    new PaymentListFilters(pageOffset, count, param(q, "chfId") || undefined)
  );
  return respond(resp, (page) => serializeSearchPage(page, serializePayment));
}

/** `GET /api/payment-gateway/methods` */
export async function handlePaymentMethods(sdk: Sdk): Promise<ApiEnvelope<PaymentGatewayMethod[]>> {
  return respond(await sdk.formalSector.paymentGateway.methods(), (m) => m);
}

/**
 * `POST /api/payment-gateway/pay` — body `{ contractId, providerCode, paymentMethodCode,
 * idempotencyKey? }` → 201 `PaymentRedirect`. The backend sets amount, currency and
 * invoice. `origin` is the portal origin the provider sends the browser back to.
 */
export async function handlePay(
  sdk: Sdk,
  body: unknown,
  ctx: { origin: string }
): Promise<ApiEnvelope<PaymentRedirect>> {
  const input = { ...parsePayContractBody(body), returnUrl: paymentReturnUrl(ctx.origin) };
  return respond(await sdk.formalSector.paymentGateway.payContract(input), (r) => r, { status: 201 });
}

/** `GET /api/payment-gateway/transactions/[id]` */
export async function handleGatewayTransactionGet(
  sdk: Sdk,
  id: string
): Promise<ApiEnvelope<GatewayTransaction>> {
  return respond(await sdk.formalSector.paymentGateway.transaction(id), (t) => t, {
    notFoundMessage: "Transaction not found",
  });
}

/** `GET /api/payment-gateway/transactions` — `?page-offset&_count`. */
export async function handleGatewayTransactionsList(
  sdk: Sdk,
  input?: SearchParamsInput
): Promise<ApiEnvelope<{ total: number; items: GatewayTransaction[] }>> {
  const { pageOffset, count } = pagingFromParams(toSearchParams(input));
  return respond(await sdk.formalSector.paymentGateway.transactions(pageOffset, count), (p) => p);
}
